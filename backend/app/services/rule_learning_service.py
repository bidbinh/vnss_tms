"""
Rule Learning Service - Auto-generate customer rules from corrections

This service analyzes correction patterns and generates rules:
1. FIELD_MAPPING: When field A always maps to field B for a customer
2. VALUE_TRANSFORM: When values are consistently transformed
3. DEFAULT_VALUE: When a field always gets the same default

Rules are auto-generated when:
- Same correction pattern appears 2+ times
- Shipper pattern is identifiable
- Correction is consistent (not random)
"""
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select, func
from collections import defaultdict
from decimal import Decimal
from datetime import datetime
import json
import hashlib

from app.models.fms.ai_training import (
    AIParsingSession,
    AICorrection,
    AICustomerRule,
    SessionStatus,
    RuleType,
)


class RuleLearningService:
    """Service for learning customer rules from corrections"""

    MIN_OCCURRENCES = 1  # Minimum times a pattern must appear (was 2, reduced to learn from first correction)
    MIN_CONFIDENCE = 0.80  # Minimum confidence to create rule

    def __init__(self, db: Session):
        self.db = db

    def learn_from_session(self, session_id: str) -> List[AICustomerRule]:
        """
        Analyze corrections in a session and generate rules.

        Criteria for rule generation:
        1. Same correction pattern appears MIN_OCCURRENCES+ times
        2. Shipper pattern is identifiable
        3. Correction is consistent
        """
        session = self.db.get(AIParsingSession, session_id)
        if not session or not session.shipper_name:
            return []

        corrections = self.db.exec(
            select(AICorrection).where(
                AICorrection.session_id == session_id
            )
        ).all()

        if not corrections:
            return []

        # Group corrections by field
        field_corrections = defaultdict(list)
        for corr in corrections:
            key = (corr.field_category, corr.field_name)
            field_corrections[key].append(corr)

        generated_rules = []
        tenant_id = session.tenant_id
        shipper_hash = session.shipper_pattern_hash

        for (category, field), corrs in field_corrections.items():
            # Analyze pattern
            pattern = self._analyze_correction_pattern(corrs)

            if pattern and pattern.get('confidence', 0) >= self.MIN_CONFIDENCE:
                # Check if similar rule already exists
                existing = self._find_similar_rule(
                    tenant_id, shipper_hash, field, pattern
                )

                if existing:
                    # Increment usage count
                    existing.times_applied += 1
                    existing.updated_at = datetime.utcnow()
                    self.db.add(existing)
                else:
                    # Create new rule
                    rule = self._create_rule_from_pattern(
                        session, category, field, pattern
                    )
                    if rule:
                        generated_rules.append(rule)
                        self.db.add(rule)

        if generated_rules:
            self.db.commit()

        return generated_rules

    def _analyze_correction_pattern(
        self,
        corrections: List[AICorrection]
    ) -> Optional[Dict]:
        """
        Analyze corrections to identify patterns.

        Patterns detected:
        - VALUE_REPLACEMENT: AI always extracts X, user always changes to Y
        - NORMALIZATION: AI extracts variations, user normalizes to same value
        - FIELD_MAPPING: Value should come from different field
        """
        if len(corrections) < self.MIN_OCCURRENCES:
            return None

        original_values = [c.original_value or "" for c in corrections]
        corrected_values = [c.corrected_value or "" for c in corrections]

        # Check for consistent replacement (all same transformation)
        value_pairs = list(set(zip(original_values, corrected_values)))

        if len(value_pairs) == 1 and value_pairs[0][0] != value_pairs[0][1]:
            # All corrections are identical transformation
            return {
                'type': RuleType.VALUE_TRANSFORM,
                'from_value': value_pairs[0][0],
                'to_value': value_pairs[0][1],
                'confidence': 1.0,
                'occurrences': len(corrections)
            }

        # Check for normalization (all corrected values are the same)
        unique_corrected = set(corrected_values)
        if len(unique_corrected) == 1 and len(set(original_values)) > 1:
            return {
                'type': RuleType.DEFAULT_VALUE,
                'default_value': list(unique_corrected)[0],
                'confidence': 0.9,
                'occurrences': len(corrections)
            }

        # Check for partner linking pattern
        partner_links = [c for c in corrections if c.linked_partner_id]
        if len(partner_links) >= self.MIN_OCCURRENCES:
            # Same partner selected multiple times
            partner_ids = [c.linked_partner_id for c in partner_links]
            most_common = max(set(partner_ids), key=partner_ids.count)
            count = partner_ids.count(most_common)

            if count >= self.MIN_OCCURRENCES:
                return {
                    'type': 'PARTNER_DEFAULT',
                    'partner_id': most_common,
                    'partner_type': partner_links[0].linked_partner_type,
                    'confidence': count / len(partner_links),
                    'occurrences': count
                }

        return None

    def _find_similar_rule(
        self,
        tenant_id: str,
        shipper_hash: str,
        field_name: str,
        pattern: Dict
    ) -> Optional[AICustomerRule]:
        """Find existing similar rule"""
        rules = self.db.exec(
            select(AICustomerRule).where(
                AICustomerRule.tenant_id == tenant_id,
                AICustomerRule.shipper_pattern_hash == shipper_hash,
                AICustomerRule.target_field == field_name,
                AICustomerRule.rule_type == pattern.get('type'),
                AICustomerRule.is_active == True
            )
        ).all()

        for rule in rules:
            logic = rule.get_transform_logic()
            if not logic:
                continue

            # Check if logic matches pattern
            if pattern.get('type') == RuleType.VALUE_TRANSFORM:
                if (logic.get('from_value') == pattern.get('from_value') and
                        logic.get('to_value') == pattern.get('to_value')):
                    return rule

            elif pattern.get('type') == RuleType.DEFAULT_VALUE:
                if logic.get('default_value') == pattern.get('default_value'):
                    return rule

        return None

    def _create_rule_from_pattern(
        self,
        session: AIParsingSession,
        category: str,
        field: str,
        pattern: Dict
    ) -> Optional[AICustomerRule]:
        """Create a new rule from detected pattern"""
        rule_type = pattern.get('type')

        transform_logic = {}
        description = ""

        if rule_type == RuleType.VALUE_TRANSFORM:
            transform_logic = {
                'from_value': pattern.get('from_value'),
                'to_value': pattern.get('to_value')
            }
            description = f"Transform '{pattern.get('from_value')[:50]}...' → '{pattern.get('to_value')[:50]}...'"

        elif rule_type == RuleType.DEFAULT_VALUE:
            transform_logic = {
                'default_value': pattern.get('default_value')
            }
            description = f"Default value: {pattern.get('default_value')[:100]}..."

        elif rule_type == 'PARTNER_DEFAULT':
            transform_logic = {
                'partner_id': pattern.get('partner_id'),
                'partner_type': pattern.get('partner_type')
            }
            description = f"Default {pattern.get('partner_type')} partner"
            rule_type = RuleType.DEFAULT_VALUE

        else:
            return None

        rule = AICustomerRule(
            tenant_id=session.tenant_id,
            customer_id=session.customer_id,
            shipper_pattern=session.shipper_name,
            shipper_pattern_hash=session.shipper_pattern_hash,
            rule_type=rule_type,
            source_field=field,
            target_field=field,
            transform_logic=json.dumps(transform_logic),
            description=description,
            times_applied=pattern.get('occurrences', 1),
            effectiveness_score=Decimal(str(pattern.get('confidence', 0.8))),
            is_active=True,
            is_auto_generated=True,
            created_by=session.created_by,
        )

        return rule

    def get_rules_for_shipper(
        self,
        tenant_id: str,
        shipper_name: str,
        document_type: Optional[str] = None,
    ) -> List[AICustomerRule]:
        """
        Get applicable rules for a shipper name.
        Uses hash matching for exact match.
        """
        if not shipper_name:
            return []

        shipper_hash = AIParsingSession.compute_shipper_hash(shipper_name)

        query = select(AICustomerRule).where(
            AICustomerRule.tenant_id == tenant_id,
            AICustomerRule.shipper_pattern_hash == shipper_hash,
            AICustomerRule.is_active == True
        )

        if document_type:
            query = query.where(
                (AICustomerRule.document_type == document_type) |
                (AICustomerRule.document_type.is_(None))
            )

        # Sort by effectiveness
        query = query.order_by(AICustomerRule.effectiveness_score.desc())

        return list(self.db.exec(query).all())

    def apply_rules_to_result(
        self,
        result: Dict[str, Any],
        rules: List[AICustomerRule]
    ) -> Dict[str, Any]:
        """
        Apply customer-specific rules to transform AI output.
        Returns modified result dict.
        """
        modified = result.copy()

        for rule in rules:
            logic = rule.get_transform_logic()
            if not logic:
                continue

            target_field = rule.target_field

            if rule.rule_type == RuleType.VALUE_TRANSFORM:
                # Check if current value matches 'from_value'
                current = modified.get(target_field)
                if current == logic.get('from_value'):
                    modified[target_field] = logic.get('to_value')
                    rule.times_applied += 1

            elif rule.rule_type == RuleType.DEFAULT_VALUE:
                # Set default if field is empty
                current = modified.get(target_field)
                if not current:
                    modified[target_field] = logic.get('default_value')
                    rule.times_applied += 1

            elif rule.rule_type == RuleType.FIELD_MAPPING:
                # Copy value from source to target
                source_field = rule.source_field
                source_value = modified.get(source_field)
                if source_value:
                    modified[target_field] = source_value
                    rule.times_applied += 1

        return modified

    def record_rule_override(self, rule_id: str) -> bool:
        """Record when a user overrides (rejects) a rule-applied value"""
        rule = self.db.get(AICustomerRule, rule_id)
        if rule:
            rule.times_overridden += 1
            rule.effectiveness_score = Decimal(str(rule.calculate_effectiveness()))
            rule.updated_at = datetime.utcnow()

            # Deactivate rule if too many overrides
            if rule.times_overridden > 5 and rule.effectiveness_score < Decimal('0.5'):
                rule.is_active = False

            self.db.add(rule)
            self.db.commit()
            return True
        return False

    def get_correction_analytics(
        self,
        tenant_id: str,
        shipper_pattern_hash: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get analytics on AI accuracy and corrections.
        Used for identifying improvement areas.
        """
        from datetime import timedelta

        cutoff = datetime.utcnow() - timedelta(days=days)

        # Base query
        session_query = select(AIParsingSession).where(
            AIParsingSession.tenant_id == tenant_id,
            AIParsingSession.created_at >= cutoff,
            AIParsingSession.status == SessionStatus.APPROVED
        )

        if shipper_pattern_hash:
            session_query = session_query.where(
                AIParsingSession.shipper_pattern_hash == shipper_pattern_hash
            )

        sessions = self.db.exec(session_query).all()

        if not sessions:
            return {
                "total_sessions": 0,
                "avg_correction_rate": 0,
                "top_corrected_fields": [],
                "accuracy_trend": []
            }

        # Calculate stats
        total_parsed = sum(s.total_fields_parsed for s in sessions)
        total_corrected = sum(s.total_fields_corrected for s in sessions)
        avg_correction_rate = total_corrected / total_parsed if total_parsed > 0 else 0

        # Get top corrected fields
        corrections = self.db.exec(
            select(
                AICorrection.field_name,
                func.count(AICorrection.id).label('count')
            ).where(
                AICorrection.session_id.in_([s.id for s in sessions])
            ).group_by(
                AICorrection.field_name
            ).order_by(
                func.count(AICorrection.id).desc()
            ).limit(10)
        ).all()

        top_fields = [{"field": f[0], "corrections": f[1]} for f in corrections]

        return {
            "total_sessions": len(sessions),
            "total_fields_parsed": total_parsed,
            "total_fields_corrected": total_corrected,
            "avg_correction_rate": round(avg_correction_rate, 4),
            "accuracy_rate": round(1 - avg_correction_rate, 4),
            "top_corrected_fields": top_fields,
            "active_rules": len([s for s in sessions if s.shipper_pattern_hash])
        }
