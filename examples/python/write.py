import json

import requests
from requests.auth import HTTPBasicAuth

with open("examples/stg.json", "r") as f:
    stg_json = json.load(f)

cdt = stg_json["credentials"]
auth = HTTPBasicAuth(cdt["user"], cdt["pass"])
headers = {"Content-Type": "application/json"}

def main():
    with open("examples/post.json", "r") as f:
        response = requests.post(
            f'{stg_json["url"]}/modify',
            json=json.load(f),
            headers=headers,
            auth=auth
        )

if __name__ == '__main__':
    main()