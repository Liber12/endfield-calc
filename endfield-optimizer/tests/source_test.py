"""Check the integrated source path without replacing the validated snapshot."""
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'src'))

from master_converter import build_master


def main():
    master = build_master(PROJECT_ROOT)
    assert len(master['items']) >= 170
    assert len(master['recipes']) >= 250
    assert len(master['facilities']) >= 15
    recipe_ids = [r['id'] for r in master['recipes']]
    assert len(recipe_ids) == len(set(recipe_ids)), 'Duplicate recipe IDs'
    for recipe in master['recipes']:
        assert recipe['facilityId'] in master['facilities'], recipe['id']
        assert recipe['time'] > 0, recipe['id']
        for item in recipe['inputs'] + recipe['outputs']:
            assert item['id'] in master['items'], recipe['id']
    for item_id in ('item_originium_ore', 'item_liquid_water', 'item_liquid_acid'):
        assert master['items'][item_id]['isRaw'], item_id
    assert master["sourceVersion"] == "0.10.0", master["sourceVersion"]
    assert master["facilities"]["liquid_clean_gate_1"]["domains"] == ["domain_2"]
    assert len(master["facilitySustainDrains"]) >= 2
    assert len(master["vaporizerEnvs"]) == 4
    assert master["regionalRawCaps"]["domain_2"]["item_gas_inert"] == 460
    assert master["regionalRawCaps"]["domain_2"]["item_gas_xiranite"] == 100
    assert master["rawSourceFacilities"]["item_liquid_water"]["ratePerMinute"] == 60
    assert any(r["gasEnv"] for r in master["recipes"]), "Gas-env recipe lost during conversion"
    print('Integrated calculator source conversion passed.')


if __name__ == '__main__':
    main()
