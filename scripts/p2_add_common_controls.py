#!/usr/bin/env python3
"""P2: Add missing common controls to all templates and configs."""

import json
import re
import os

TEMPLATES_DIR = "/Users/choiminsuk/Desktop/beautypass_marketing/vitalconnection/thumbnail/templates"
CONFIGS_DIR = "/Users/choiminsuk/Desktop/beautypass_marketing/vitalconnection/thumbnail/configs"
OVERRIDE_MARKER = "/* === 에디터 커스텀 오버라이드 ===*/"


def has_css_rule(html: str, selector: str) -> bool:
    """Check if a CSS rule for the given selector exists in the HTML."""
    # Look for patterns like '.model {' or 'img.model {' or '.model\n{'
    pattern = re.compile(r'\.' + re.escape(selector.lstrip('.')) + r'\s*\{')
    return bool(pattern.search(html))


def has_var(html: str, var_name: str) -> bool:
    """Check if a CSS var name is referenced anywhere in the file."""
    return f'--{var_name}' in html or f'var({var_name}' in html


def existing_headline_has_line_height(html: str) -> bool:
    """Check if the existing .headline CSS block already contains line-height."""
    # Find the .headline { ... } block
    match = re.search(r'\.headline\s*\{([^}]*)\}', html, re.DOTALL)
    if not match:
        return False
    block = match.group(1)
    return 'line-height' in block


def add_to_override_block(html: str, new_rules: list[str]) -> str:
    """Add new CSS rules to the override block, or create the block before </style>."""
    if not new_rules:
        return html

    rules_str = '\n'.join(f'  {r}' for r in new_rules)

    if OVERRIDE_MARKER in html:
        # Insert right before </style>
        html = html.replace('</style>', rules_str + '\n</style>', 1)
    else:
        # Create new override block before </style>
        block = f'\n  {OVERRIDE_MARKER}\n{rules_str}\n</style>'
        html = html.replace('</style>', block, 1)

    return html


def process_template(template_path: str, config_path: str):
    template_name = os.path.basename(template_path).replace('.html', '')

    with open(template_path, 'r', encoding='utf-8') as f:
        html = f.read()

    has_model_rule = has_css_rule(html, '.model')
    has_headline_rule = has_css_rule(html, '.headline')
    headline_has_lh = existing_headline_has_line_height(html)

    new_rules = []

    # Rule 1: model-opacity + model-brightness
    if has_model_rule and not has_var(html, 'model-opacity'):
        new_rules.append('.model { opacity: var(--model-opacity, 1); filter: brightness(var(--model-brightness, 1)); }')

    # Rule 2: headline-z-index
    if has_headline_rule and not has_var(html, 'headline-z-index'):
        new_rules.append('.headline { z-index: var(--headline-z-index, 5); }')

    # Rule 3: headline-line-height (only if .headline doesn't already have line-height in its block)
    if has_headline_rule and not has_var(html, 'headline-line-height') and not headline_has_lh:
        new_rules.append('.headline { line-height: var(--headline-line-height, 1.2); }')

    # Rule 4: headline-opacity
    if has_headline_rule and not has_var(html, 'headline-opacity'):
        new_rules.append('.headline { opacity: var(--headline-opacity, 1); }')

    if new_rules:
        html = add_to_override_block(html, new_rules)
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'  [HTML] {template_name}: added {len(new_rules)} rule(s)')
    else:
        print(f'  [HTML] {template_name}: no changes needed')

    # Now handle config
    if not os.path.exists(config_path):
        print(f'  [JSON] {template_name}: config not found, skipping')
        return

    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    vars_changed = False
    controls_changed = False

    # Add default var values if not present
    default_vars = {
        'model-opacity': '1',
        'model-brightness': '1',
        'headline-z-index': '5',
        'headline-opacity': '1',
    }
    for var_name, default_val in default_vars.items():
        if var_name not in config.get('vars', {}):
            # Only add if the relevant element exists in template
            if var_name.startswith('model') and has_model_rule:
                config.setdefault('vars', {})[var_name] = default_val
                vars_changed = True
            elif var_name.startswith('headline') and has_headline_rule:
                config.setdefault('vars', {})[var_name] = default_val
                vars_changed = True

    # Add headline-line-height var if needed
    if has_headline_rule and not headline_has_lh and 'headline-line-height' not in config.get('vars', {}):
        config.setdefault('vars', {})['headline-line-height'] = '1.2'
        vars_changed = True

    # Helper: find group by name
    def find_group(name: str):
        for g in config.get('controls', []):
            if g['group'] == name:
                return g
        return None

    def has_item(group, var_name: str) -> bool:
        return any(item['var'] == var_name for item in group.get('items', []))

    # Add model controls to "모델" group
    if has_model_rule:
        model_group = find_group('모델')
        if model_group is None:
            model_group = {'group': '모델', 'items': []}
            config.setdefault('controls', []).append(model_group)
            controls_changed = True

        if not has_item(model_group, 'model-opacity'):
            model_group['items'].append({
                'var': 'model-opacity', 'label': '모델 불투명도',
                'type': 'range', 'min': 0, 'max': 1, 'unit': '', 'step': 0.05
            })
            controls_changed = True

        if not has_item(model_group, 'model-brightness'):
            model_group['items'].append({
                'var': 'model-brightness', 'label': '모델 밝기',
                'type': 'range', 'min': 0.3, 'max': 2, 'unit': '', 'step': 0.05
            })
            controls_changed = True

    # Add headline controls to "헤드라인 커스텀" group
    if has_headline_rule:
        hl_group = find_group('헤드라인 커스텀')
        if hl_group is None:
            hl_group = {'group': '헤드라인 커스텀', 'items': []}
            config.setdefault('controls', []).append(hl_group)
            controls_changed = True

        if not has_item(hl_group, 'headline-z-index'):
            hl_group['items'].append({
                'var': 'headline-z-index', 'label': '헤드라인 레이어',
                'type': 'range', 'min': 0, 'max': 20, 'unit': ''
            })
            controls_changed = True

        if not has_item(hl_group, 'headline-opacity'):
            hl_group['items'].append({
                'var': 'headline-opacity', 'label': '헤드라인 불투명도',
                'type': 'range', 'min': 0, 'max': 1, 'unit': '', 'step': 0.05
            })
            controls_changed = True

        # Add line-height only if template .headline block doesn't already have line-height
        if not headline_has_lh and not has_item(hl_group, 'headline-line-height'):
            hl_group['items'].append({
                'var': 'headline-line-height', 'label': '줄간격',
                'type': 'range', 'min': 0.8, 'max': 2.5, 'unit': '', 'step': 0.05
            })
            controls_changed = True

    if vars_changed or controls_changed:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        print(f'  [JSON] {template_name}: updated (vars={vars_changed}, controls={controls_changed})')
    else:
        print(f'  [JSON] {template_name}: no changes needed')


def main():
    templates = sorted([
        f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.html')
    ])

    print(f'Processing {len(templates)} templates...\n')

    for template_file in templates:
        template_name = template_file.replace('.html', '')
        template_path = os.path.join(TEMPLATES_DIR, template_file)
        config_path = os.path.join(CONFIGS_DIR, f'{template_name}.json')

        print(f'--- {template_name}')
        process_template(template_path, config_path)

    print('\nDone.')


if __name__ == '__main__':
    main()
