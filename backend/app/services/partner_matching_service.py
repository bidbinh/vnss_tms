"""
Partner Matching Service - Smart matching for AI-extracted partner names

Matching priority:
1. EXACT: name_hash match → confidence 1.0
2. TAX_CODE: exact tax_code match → confidence 0.98
3. ALIAS: name in alias_names → confidence 0.95
4. FUZZY: token-based Jaccard similarity >85% → confidence = similarity

Auto-select threshold: confidence >= 0.90
"""
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select
from dataclasses import dataclass
from decimal import Decimal
import json
import hashlib

from app.models.fms.customs_partners import (
    CustomsExporter,
    CustomsImporter,
    normalize_partner_name,
)


@dataclass
class PartnerMatchResult:
    """Single match result"""
    partner_id: str
    name: str
    address: Optional[str]
    tax_code: Optional[str]
    country_code: Optional[str]
    match_method: str  # EXACT, TAX_CODE, ALIAS, FUZZY
    confidence: float

    def to_dict(self) -> Dict:
        return {
            "partner_id": self.partner_id,
            "name": self.name,
            "address": self.address,
            "tax_code": self.tax_code,
            "country_code": self.country_code,
            "match_method": self.match_method,
            "confidence": self.confidence,
        }


@dataclass
class PartnerMatchResponse:
    """Response for partner matching"""
    best_match: Optional[PartnerMatchResult]
    alternatives: List[PartnerMatchResult]
    should_auto_select: bool  # True if confidence >= 0.90

    def to_dict(self) -> Dict:
        return {
            "best_match": self.best_match.to_dict() if self.best_match else None,
            "alternatives": [a.to_dict() for a in self.alternatives],
            "should_auto_select": self.should_auto_select,
        }


class PartnerMatchingService:
    """Service for matching AI-extracted names to database partners"""

    AUTO_SELECT_THRESHOLD = 0.90
    FUZZY_THRESHOLD = 0.85

    def __init__(self, db: Session):
        self.db = db

    def match_exporter(
        self,
        name: str,
        address: Optional[str] = None,
        country_code: Optional[str] = None,
        tenant_id: str = None,
    ) -> PartnerMatchResponse:
        """
        Match extracted exporter name to CustomsExporter.
        """
        if not name or not tenant_id:
            return PartnerMatchResponse(
                best_match=None,
                alternatives=[],
                should_auto_select=False
            )

        matches: List[PartnerMatchResult] = []

        # Normalize input
        normalized_name = normalize_partner_name(name)
        name_hash = hashlib.sha256(normalized_name.encode()).hexdigest()

        # 1. Try exact match (by hash)
        exact_matches = self.db.exec(
            select(CustomsExporter).where(
                CustomsExporter.tenant_id == tenant_id,
                CustomsExporter.name_hash == name_hash,
                CustomsExporter.is_active == True
            )
        ).all()

        for exp in exact_matches:
            matches.append(PartnerMatchResult(
                partner_id=exp.id,
                name=exp.name,
                address=exp.address_line_1,
                tax_code=exp.tax_code,
                country_code=exp.country_code,
                match_method="EXACT",
                confidence=1.0
            ))

        # 2. Try alias match
        if not matches or len(matches) < 3:
            alias_matches = self._find_by_alias(
                CustomsExporter, normalized_name, tenant_id
            )
            for exp in alias_matches:
                if exp.id not in [m.partner_id for m in matches]:
                    matches.append(PartnerMatchResult(
                        partner_id=exp.id,
                        name=exp.name,
                        address=exp.address_line_1,
                        tax_code=exp.tax_code,
                        country_code=exp.country_code,
                        match_method="ALIAS",
                        confidence=0.95
                    ))

        # 3. Fuzzy match
        if not matches or len(matches) < 5:
            fuzzy_matches = self._fuzzy_match(
                CustomsExporter, normalized_name, tenant_id
            )
            for exp, similarity in fuzzy_matches:
                if exp.id not in [m.partner_id for m in matches]:
                    matches.append(PartnerMatchResult(
                        partner_id=exp.id,
                        name=exp.name,
                        address=exp.address_line_1,
                        tax_code=exp.tax_code,
                        country_code=exp.country_code,
                        match_method="FUZZY",
                        confidence=similarity
                    ))

        # Sort by confidence (descending), then by user_select_count
        matches.sort(key=lambda x: (x.confidence, 0), reverse=True)

        # Determine if should auto-select
        best_match = matches[0] if matches else None
        should_auto_select = best_match and best_match.confidence >= self.AUTO_SELECT_THRESHOLD

        return PartnerMatchResponse(
            best_match=best_match,
            alternatives=matches[1:5] if len(matches) > 1 else [],
            should_auto_select=should_auto_select
        )

    def match_importer(
        self,
        name: str,
        address: Optional[str] = None,
        tax_code: Optional[str] = None,
        tenant_id: str = None,
    ) -> PartnerMatchResponse:
        """
        Match extracted importer name to CustomsImporter.
        Special: Also matches by tax_code if provided.
        """
        if not tenant_id:
            return PartnerMatchResponse(
                best_match=None,
                alternatives=[],
                should_auto_select=False
            )

        matches: List[PartnerMatchResult] = []

        # 1. Try tax code match first (highest priority for importers)
        if tax_code:
            clean_tax = tax_code.replace('-', '').replace(' ', '').upper()
            tax_hash = hashlib.sha256(clean_tax.encode()).hexdigest()

            tax_matches = self.db.exec(
                select(CustomsImporter).where(
                    CustomsImporter.tenant_id == tenant_id,
                    CustomsImporter.tax_code_hash == tax_hash,
                    CustomsImporter.is_active == True
                )
            ).all()

            for imp in tax_matches:
                matches.append(PartnerMatchResult(
                    partner_id=imp.id,
                    name=imp.name,
                    address=imp.address,
                    tax_code=imp.tax_code,
                    country_code=None,
                    match_method="TAX_CODE",
                    confidence=0.98
                ))

        if not name:
            # Only tax code matching
            best_match = matches[0] if matches else None
            return PartnerMatchResponse(
                best_match=best_match,
                alternatives=matches[1:5] if len(matches) > 1 else [],
                should_auto_select=best_match and best_match.confidence >= self.AUTO_SELECT_THRESHOLD
            )

        # Normalize input
        normalized_name = normalize_partner_name(name)
        name_hash = hashlib.sha256(normalized_name.encode()).hexdigest()

        # 2. Try exact name match
        exact_matches = self.db.exec(
            select(CustomsImporter).where(
                CustomsImporter.tenant_id == tenant_id,
                CustomsImporter.name_hash == name_hash,
                CustomsImporter.is_active == True
            )
        ).all()

        for imp in exact_matches:
            if imp.id not in [m.partner_id for m in matches]:
                matches.append(PartnerMatchResult(
                    partner_id=imp.id,
                    name=imp.name,
                    address=imp.address,
                    tax_code=imp.tax_code,
                    country_code=None,
                    match_method="EXACT",
                    confidence=1.0
                ))

        # 3. Try alias match
        if not matches or len(matches) < 3:
            alias_matches = self._find_by_alias(
                CustomsImporter, normalized_name, tenant_id
            )
            for imp in alias_matches:
                if imp.id not in [m.partner_id for m in matches]:
                    matches.append(PartnerMatchResult(
                        partner_id=imp.id,
                        name=imp.name,
                        address=imp.address,
                        tax_code=imp.tax_code,
                        country_code=None,
                        match_method="ALIAS",
                        confidence=0.95
                    ))

        # 4. Fuzzy match
        if not matches or len(matches) < 5:
            fuzzy_matches = self._fuzzy_match(
                CustomsImporter, normalized_name, tenant_id
            )
            for imp, similarity in fuzzy_matches:
                if imp.id not in [m.partner_id for m in matches]:
                    matches.append(PartnerMatchResult(
                        partner_id=imp.id,
                        name=imp.name,
                        address=imp.address,
                        tax_code=imp.tax_code,
                        country_code=None,
                        match_method="FUZZY",
                        confidence=similarity
                    ))

        # Sort by confidence
        matches.sort(key=lambda x: x.confidence, reverse=True)

        best_match = matches[0] if matches else None
        should_auto_select = best_match and best_match.confidence >= self.AUTO_SELECT_THRESHOLD

        return PartnerMatchResponse(
            best_match=best_match,
            alternatives=matches[1:5] if len(matches) > 1 else [],
            should_auto_select=should_auto_select
        )

    def _find_by_alias(self, model_class, normalized_name: str, tenant_id: str) -> List:
        """Find partners where normalized_name is in alias_names"""
        # Get all active partners with aliases
        partners = self.db.exec(
            select(model_class).where(
                model_class.tenant_id == tenant_id,
                model_class.is_active == True,
                model_class.alias_names.isnot(None)
            )
        ).all()

        matches = []
        for partner in partners:
            try:
                aliases = json.loads(partner.alias_names) if partner.alias_names else []
                if normalized_name in aliases:
                    matches.append(partner)
            except (json.JSONDecodeError, TypeError):
                continue

        return matches

    def _fuzzy_match(self, model_class, normalized_name: str, tenant_id: str) -> List[tuple]:
        """
        Perform fuzzy matching using token-based Jaccard similarity.
        Returns list of (partner, similarity) tuples.
        """
        # Get all active partners with tokens
        partners = self.db.exec(
            select(model_class).where(
                model_class.tenant_id == tenant_id,
                model_class.is_active == True,
                model_class.name_tokens.isnot(None)
            )
        ).all()

        input_tokens = set(normalized_name.split())
        results = []

        for partner in partners:
            try:
                partner_tokens = set(json.loads(partner.name_tokens) if partner.name_tokens else [])

                if not partner_tokens:
                    continue

                # Jaccard similarity
                intersection = len(input_tokens & partner_tokens)
                union = len(input_tokens | partner_tokens)
                similarity = intersection / union if union > 0 else 0

                if similarity >= self.FUZZY_THRESHOLD:
                    results.append((partner, similarity))

            except (json.JSONDecodeError, TypeError):
                continue

        # Sort by similarity descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:10]  # Return top 10

    def link_partner(
        self,
        partner_type: str,
        partner_id: str,
        extracted_name: str,
        create_alias: bool = True,
        user_id: str = None,
    ) -> bool:
        """
        Link AI-extracted name to a database partner.
        Optionally creates an alias for future matching.
        Increments user_select_count.
        """
        if partner_type == "EXPORTER":
            partner = self.db.get(CustomsExporter, partner_id)
        elif partner_type == "IMPORTER":
            partner = self.db.get(CustomsImporter, partner_id)
        else:
            return False

        if not partner:
            return False

        # Increment selection count
        partner.user_select_count += 1

        # Add alias if requested
        if create_alias and extracted_name:
            partner.add_alias(extracted_name)

        self.db.add(partner)
        self.db.commit()
        return True

    def increment_ai_match(self, partner_type: str, partner_id: str) -> bool:
        """Increment ai_match_count when AI automatically selects a partner"""
        if partner_type == "EXPORTER":
            partner = self.db.get(CustomsExporter, partner_id)
        elif partner_type == "IMPORTER":
            partner = self.db.get(CustomsImporter, partner_id)
        else:
            return False

        if partner:
            partner.ai_match_count += 1
            self.db.add(partner)
            self.db.commit()
            return True
        return False

    def update_all_matching_fields(self, tenant_id: str) -> Dict[str, int]:
        """
        Update matching fields (name_normalized, name_tokens, name_hash)
        for all partners in a tenant. Run after bulk import.
        """
        counts = {"exporters": 0, "importers": 0}

        # Update exporters
        exporters = self.db.exec(
            select(CustomsExporter).where(
                CustomsExporter.tenant_id == tenant_id
            )
        ).all()

        for exp in exporters:
            exp.update_matching_fields()
            self.db.add(exp)
            counts["exporters"] += 1

        # Update importers
        importers = self.db.exec(
            select(CustomsImporter).where(
                CustomsImporter.tenant_id == tenant_id
            )
        ).all()

        for imp in importers:
            imp.update_matching_fields()
            self.db.add(imp)
            counts["importers"] += 1

        self.db.commit()
        return counts
