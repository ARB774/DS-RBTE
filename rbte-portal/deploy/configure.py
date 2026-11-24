#!/usr/bin/env python3
"""Interactive configuration on the VPS. No secret is supplied on the command line."""
import getpass
import grp
import json
import os
from pathlib import Path
import secrets
import tempfile


def prompt(label, default=""):
    answer = input(f"{label}" + (f" [{default}]" if default else "") + ": ").strip()
    return answer or default


def email(label, default):
    value = prompt(label, default)
    if "@" not in value or any(c.isspace() for c in value) or "\r" in value or "\n" in value:
        raise SystemExit("Invalid email")
    return value


if __name__ == "__main__":
    if os.geteuid() != 0:
        raise SystemExit("Run as root")
    path = Path("/etc/rbte-portal/config.json")
    old = json.loads(path.read_text()) if path.exists() else {}
    print("SMTP settings: obtain the server/port from your domain mail provider.")
    config = {"secret_key": old.get("secret_key") or secrets.token_urlsafe(64)}
    config["admin_email"] = email("Admin recipient", old.get("admin_email", "korzhuk@gmail.com"))
    config["from_email"] = email("Sender mailbox", old.get("from_email", "portal@rbte.pro"))
    config["smtp_host"] = prompt("SMTP host", old.get("smtp_host", ""))
    if not config["smtp_host"] or any(c.isspace() for c in config["smtp_host"]):
        raise SystemExit("SMTP host is required")
    config["smtp_port"] = int(prompt("SMTP port", str(old.get("smtp_port", 587))))
    config["smtp_security"] = prompt("Encryption: starttls or ssl", old.get("smtp_security", "starttls"))
    if config["smtp_security"] not in ("starttls", "ssl") or not 1 <= config["smtp_port"] <= 65535:
        raise SystemExit("Invalid SMTP port or encryption")
    config["smtp_user"] = prompt("SMTP login", old.get("smtp_user", config["from_email"]))
    config["smtp_password"] = getpass.getpass("SMTP app password (hidden; Enter keeps existing): ") or old.get("smtp_password", "")
    if not config["smtp_password"]:
        raise SystemExit("SMTP password is required")
    os.umask(0o077)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=".config-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            json.dump(config, out, indent=2)
            out.write("\n")
        os.chown(temp, 0, grp.getgrnam("rbteportal").gr_gid)
        os.chmod(temp, 0o640)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    print("Configuration saved. Secrets were not printed.")
