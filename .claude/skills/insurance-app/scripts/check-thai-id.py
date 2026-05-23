#!/usr/bin/env python3
"""Validate Thai national ID checksum.

Usage:
    check-thai-id.py 1234567890121
    echo "1234567890121" | check-thai-id.py -

Exit 0 if valid, 1 if invalid.
"""
import sys


def validate(nid: str) -> bool:
    nid = nid.strip().replace("-", "").replace(" ", "")
    if len(nid) != 13 or not nid.isdigit():
        return False
    total = sum(int(nid[i]) * (13 - i) for i in range(12))
    check = (11 - (total % 11)) % 10
    return check == int(nid[12])


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    arg = sys.argv[1]
    nid = sys.stdin.read() if arg == "-" else arg
    ok = validate(nid)
    print(("VALID" if ok else "INVALID") + ": " + nid.strip())
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
