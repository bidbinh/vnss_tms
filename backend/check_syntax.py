import ast
with open('app/api/v1/routes/fms/parsing_instructions.py', 'r', encoding='utf-8') as f:
    content = f.read()
try:
    ast.parse(content)
    print("Syntax OK")
except SyntaxError as e:
    print(f"Syntax Error: {e}")
