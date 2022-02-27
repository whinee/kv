import json

import requests

with open("examples/stg.json", "r") as f:
    stg_json = json.load(f)

def main():
    resp = requests.get(f'{stg_json["url"]}/a/{stg_json["key"]}')
    print(resp.json())

if __name__ == '__main__':
    main()