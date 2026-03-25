import json, os

try:
    with open("npm-audit.json") as f:
        audit = json.load(f)
    vulns = audit.get("vulnerabilities", {})
    by_sev = {}
    for v in vulns.values():
        s = v.get("severity", "unknown")
        by_sev[s] = by_sev.get(s, 0) + 1
except Exception:
    vulns, by_sev = {}, {}

try:
    with open("npm-outdated.json") as f:
        outdated = json.load(f)
except Exception:
    outdated = {}

try:
    with open("sbom.json") as f:
        sbom = json.load(f)
    total = len(sbom.get("components", []))
except Exception:
    total = 0

lines = [
    "## SBOM — dao-project\n",
    "| Metrique | Valeur |",
    "|---|---|",
    "| Dependances totales | " + str(total) + " |",
    "| CVE critiques | " + str(by_sev.get("critical", 0)) + " |",
    "| CVE hautes | " + str(by_sev.get("high", 0)) + " |",
    "| CVE moderees | " + str(by_sev.get("moderate", 0)) + " |",
    "| Packages obsoletes | " + str(len(outdated)) + " |",
    "\n> Telecharge le rapport HTML dans les **Artifacts** de ce workflow.",
]

summary_file = os.environ.get("GITHUB_STEP_SUMMARY", "/dev/stdout")
with open(summary_file, "a") as f:
    f.write("\n".join(lines))

print("Resume genere")
