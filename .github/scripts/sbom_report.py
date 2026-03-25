import json, os
from datetime import datetime

git_branch = os.environ.get("GIT_BRANCH", "local")
git_sha = os.environ.get("GIT_SHA", "local")
git_sha_short = git_sha[:7] if len(git_sha) > 7 else git_sha

with open("sbom.json") as f:
    sbom = json.load(f)

try:
    with open("npm-audit.json") as f:
        audit = json.load(f)
    vulnerabilities = audit.get("vulnerabilities", {})
except Exception:
    vulnerabilities = {}

try:
    with open("npm-outdated.json") as f:
        outdated = json.load(f)
except Exception:
    outdated = {}

components = sbom.get("components", [])
metadata = sbom.get("metadata", {})
proj = metadata.get("component", {})
proj_name = proj.get("name", "dao-project")
proj_version = proj.get("version", "0.1.0")
timestamp = metadata.get("timestamp", datetime.now().isoformat())[:10]

total = len(components)
vuln_count = len(vulnerabilities)
outdated_count = len(outdated)

sev_counts = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
for v in vulnerabilities.values():
    s = v.get("severity", "low")
    if s in sev_counts:
        sev_counts[s] += 1

lic_counts = {}
for c in components:
    lics = c.get("licenses", [])
    for l in lics:
        lid = l.get("license", {}).get("id") or l.get("license", {}).get("name", "Unknown")
        lic_counts[lid] = lic_counts.get(lid, 0) + 1
if not lic_counts:
    lic_counts = {"Unknown": total}


def lic_badge(lic):
    if "MIT" in lic:
        return "mit"
    if "Apache" in lic:
        return "apache"
    if "ISC" in lic:
        return "isc"
    if "BSD" in lic:
        return "bsd"
    return "other"


def sev_color(sev):
    colors = {
        "critical": "#dc3545",
        "high": "#fd7e14",
        "moderate": "#ffc107",
        "low": "#17a2b8",
    }
    return colors.get(sev, "#6c757d")


css = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8f9fa; color: #212529; }
.header { background: #1e3a8a; color: white; padding: 32px 40px; }
.header h1 { font-size: 26px; font-weight: 700; margin-bottom: 8px; }
.header p { opacity: 0.85; font-size: 13px; }
.stats { display: flex; gap: 12px; padding: 20px 40px; background: white; border-bottom: 1px solid #e9ecef; flex-wrap: wrap; }
.stat { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 14px 20px; text-align: center; min-width: 110px; }
.stat .num { font-size: 28px; font-weight: 700; }
.stat .label { font-size: 11px; color: #6c757d; margin-top: 4px; }
.num-ok { color: #28a745; } .num-warn { color: #fd7e14; }
.num-danger { color: #dc3545; } .num-info { color: #1e3a8a; }
.section { padding: 20px 40px; background: white; border-bottom: 1px solid #e9ecef; }
.section h2 { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #495057; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; }
.badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; display: inline-block; }
.mit { background: #d4edda; color: #155724; } .apache { background: #cce5ff; color: #004085; }
.isc { background: #e2d9f3; color: #432874; } .bsd { background: #fff3cd; color: #856404; }
.other { background: #e9ecef; color: #495057; }
.cve-section { padding: 20px 40px; background: white; border-bottom: 1px solid #e9ecef; }
.cve-section h2 { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #495057; }
.cve-item { border: 1px solid #e9ecef; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px; }
.cve-item.critical { border-left: 4px solid #dc3545; }
.cve-item.high { border-left: 4px solid #fd7e14; }
.cve-item.moderate { border-left: 4px solid #ffc107; }
.cve-item.low { border-left: 4px solid #17a2b8; }
.cve-name { font-weight: 600; font-size: 13px; }
.cve-meta { font-size: 11px; color: #6c757d; margin-top: 4px; }
.toolbar { padding: 12px 40px; background: white; border-bottom: 1px solid #e9ecef; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.toolbar input { padding: 7px 14px; border: 1px solid #ced4da; border-radius: 6px; font-size: 13px; width: 280px; }
.toolbar select { padding: 7px 14px; border: 1px solid #ced4da; border-radius: 6px; font-size: 13px; }
.table-wrap { padding: 20px 40px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 12px; }
thead { background: #1e3a8a; color: white; }
th { padding: 10px 14px; text-align: left; font-weight: 600; white-space: nowrap; }
td { padding: 9px 14px; border-bottom: 1px solid #f1f3f4; vertical-align: middle; }
tr:hover td { background: #f8f9fa; }
tr.has-vuln td { background: #fff5f5; }
tr.is-outdated td { background: #fffbf0; }
.ver { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.ver-new { font-family: monospace; background: #d4edda; color: #155724; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.ver-outdated { font-family: monospace; background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.sev-pill { font-size: 10px; padding: 2px 7px; border-radius: 10px; color: white; font-weight: 600; display: inline-block; }
.hash { font-family: monospace; font-size: 10px; color: #adb5bd; }
a { color: #1e3a8a; text-decoration: none; }
a:hover { text-decoration: underline; }
.icon-vuln { color: #dc3545; } .icon-ok { color: #28a745; } .icon-outdated { color: #fd7e14; }
.footer { text-align: center; padding: 20px; color: #6c757d; font-size: 11px; border-top: 1px solid #e9ecef; margin-top: 20px; }
"""

js = """
function filterTable() {
    var q = document.getElementById('search').value.toLowerCase();
    var f = document.getElementById('filter').value;
    document.querySelectorAll('#sbom-table tbody tr').forEach(function(r) {
        var text = r.textContent.toLowerCase();
        var hv = r.dataset.vuln === 'true';
        var io = r.dataset.outdated === 'true';
        var mt = text.indexOf(q) !== -1;
        var mf = f === 'all'
            || (f === 'vuln' && hv)
            || (f === 'outdated' && io)
            || (f === 'ok' && !hv && !io);
        r.style.display = (mt && mf) ? '' : 'none';
    });
}
"""

lines = []
lines.append("<!DOCTYPE html>")
lines.append("<html lang='fr'>")
lines.append("<head>")
lines.append("<meta charset='UTF-8'>")
lines.append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
lines.append("<title>SBOM — " + proj_name + "</title>")
lines.append("<style>" + css + "</style>")
lines.append("</head><body>")

lines.append("<div class='header'>")
lines.append("<h1>Software Bill of Materials (SBOM)</h1>")
lines.append(
    "<p>Projet : <strong>" + proj_name + " v" + proj_version + "</strong>"
    " &nbsp;|&nbsp; Date : <strong>" + timestamp + "</strong>"
    " &nbsp;|&nbsp; Format : <strong>CycloneDX 1.6</strong>"
    " &nbsp;|&nbsp; Branche : <strong>" + git_branch + "</strong>"
    " &nbsp;|&nbsp; Commit : <strong>" + git_sha_short + "</strong></p>"
)
lines.append("</div>")

c_crit = sev_counts["critical"]
c_high = sev_counts["high"]
c_mod = sev_counts["moderate"]

def num_class(val, danger_cls, warn_cls):
    if val > 0:
        return danger_cls
    return "num-ok"

lines.append("<div class='stats'>")
lines.append("<div class='stat'><div class='num num-info'>" + str(total) + "</div><div class='label'>Dépendances totales</div></div>")
lines.append("<div class='stat'><div class='num " + ("num-danger" if c_crit > 0 else "num-ok") + "'>" + str(c_crit) + "</div><div class='label'>CVE Critiques</div></div>")
lines.append("<div class='stat'><div class='num " + ("num-warn" if c_high > 0 else "num-ok") + "'>" + str(c_high) + "</div><div class='label'>CVE Hautes</div></div>")
lines.append("<div class='stat'><div class='num " + ("num-warn" if c_mod > 0 else "num-ok") + "'>" + str(c_mod) + "</div><div class='label'>CVE Modérées</div></div>")
lines.append("<div class='stat'><div class='num " + ("num-warn" if outdated_count > 0 else "num-ok") + "'>" + str(outdated_count) + "</div><div class='label'>Versions obsolètes</div></div>")
lines.append("<div class='stat'><div class='num num-info'>" + str(len(lic_counts)) + "</div><div class='label'>Licences distinctes</div></div>")
lines.append("</div>")

lines.append("<div class='cve-section'>")
lines.append("<h2>Vulnérabilités CVE (" + str(vuln_count) + ")</h2>")
if vulnerabilities:
    order = ["critical", "high", "moderate", "low"]
    sorted_vulns = sorted(
        vulnerabilities.items(),
        key=lambda x: order.index(x[1].get("severity", "low")) if x[1].get("severity", "low") in order else 4
    )
    for pkg, vuln in sorted_vulns:
        sev = vuln.get("severity", "low")
        via = vuln.get("via", [])
        via_parts = []
        for v in via[:3]:
            if isinstance(v, str):
                via_parts.append(v)
            elif isinstance(v, dict):
                via_parts.append(v.get("title", ""))
        via_str = ", ".join(p for p in via_parts if p) or "direct"
        fix = vuln.get("fixAvailable", False)
        fix_str = "Fix disponible" if fix else "Pas de fix"
        ver_range = vuln.get("range", "N/A")
        lines.append(
            "<div class='cve-item " + sev + "'>"
            "<div class='cve-name'>" + pkg +
            " <span class='sev-pill' style='background:" + sev_color(sev) + "'>" + sev.upper() + "</span></div>"
            "<div class='cve-meta'>Via : " + via_str +
            " &nbsp;|&nbsp; " + fix_str +
            " &nbsp;|&nbsp; Version affectée : " + ver_range + "</div>"
            "</div>"
        )
else:
    lines.append("<p style='color:#28a745;font-weight:600'>Aucune vulnérabilité détectée.</p>")
lines.append("</div>")

lines.append("<div class='section'>")
lines.append("<h2>Distribution des licences</h2>")
lines.append("<div class='badges'>")
for lic, count in sorted(lic_counts.items(), key=lambda x: -x[1]):
    lines.append("<span class='badge " + lic_badge(lic) + "'>" + lic + " (" + str(count) + ")</span>")
lines.append("</div></div>")

lines.append(
    "<div class='toolbar'>"
    "<input type='text' id='search' placeholder='Rechercher une dépendance...' oninput='filterTable()'>"
    "<select id='filter' onchange='filterTable()'>"
    "<option value='all'>Toutes les dépendances</option>"
    "<option value='vuln'>Avec CVE</option>"
    "<option value='outdated'>Obsolètes</option>"
    "<option value='ok'>Sans problème</option>"
    "</select></div>"
)

lines.append("<div class='table-wrap'>")
lines.append("<table id='sbom-table'>")
lines.append(
    "<thead><tr>"
    "<th>#</th><th>Statut</th><th>Nom</th>"
    "<th>Version installée</th><th>Dernière version</th>"
    "<th>Licence</th><th>CVE</th><th>PURL</th><th>Hash SHA-1</th>"
    "</tr></thead><tbody>"
)

for i, c in enumerate(sorted(components, key=lambda x: x.get("name", "").lower()), 1):
    name = c.get("name", "")
    version = c.get("version", "")
    purl = c.get("purl", "")

    lics = c.get("licenses", [])
    lic_str = ", ".join(
        l.get("license", {}).get("id") or l.get("license", {}).get("name", "Unknown")
        for l in lics
    ) if lics else "Unknown"

    hashes = c.get("hashes", [])
    hash_val = next((h.get("content", "") for h in hashes if h.get("alg") == "SHA-1"), "")

    out_info = outdated.get(name, {})
    latest = out_info.get("latest", "")
    is_outdated = bool(out_info)

    vuln_info = vulnerabilities.get(name, {})
    has_vuln = bool(vuln_info)
    vuln_sev = vuln_info.get("severity", "") if has_vuln else ""

    row_class = "has-vuln" if has_vuln else ("is-outdated" if is_outdated else "")
    status_icon = "&#9888;" if has_vuln else ("&#9651;" if is_outdated else "&#10003;")
    status_class = "icon-vuln" if has_vuln else ("icon-outdated" if is_outdated else "icon-ok")
    ver_class = "ver-outdated" if is_outdated else "ver"
    latest_display = "<span class='ver-new'>" + latest + "</span>" if latest else "<span style='color:#adb5bd'>—</span>"
    cve_display = (
        "<span class='sev-pill' style='background:" + sev_color(vuln_sev) + "'>" + vuln_sev.upper() + "</span>"
        if has_vuln else "<span style='color:#28a745'>—</span>"
    )
    purl_short = purl.replace("pkg:npm/", "").split("?")[0] if purl else ""
    hash_short = hash_val[:20] + "..." if len(hash_val) > 20 else hash_val

    lines.append(
        "<tr class='" + row_class + "' data-vuln='" + str(has_vuln).lower() + "' data-outdated='" + str(is_outdated).lower() + "'>"
        "<td>" + str(i) + "</td>"
        "<td class='" + status_class + "'>" + status_icon + "</td>"
        "<td><a href='https://www.npmjs.com/package/" + name + "' target='_blank'>" + name + "</a></td>"
        "<td><span class='" + ver_class + "'>" + version + "</span></td>"
        "<td>" + latest_display + "</td>"
        "<td><span class='badge " + lic_badge(lic_str) + "'>" + lic_str + "</span></td>"
        "<td>" + cve_display + "</td>"
        "<td style='font-size:10px;color:#6c757d'>" + purl_short + "</td>"
        "<td><span class='hash'>" + hash_short + "</span></td>"
        "</tr>"
    )

lines.append("</tbody></table></div>")
lines.append("<div class='footer'>SBOM généré avec CycloneDX &middot; Conforme NTIA Minimum Elements &middot; dao-project</div>")
lines.append("<script>" + js + "</script>")
lines.append("</body></html>")

with open("sbom-report.html", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Rapport genere : " + str(total) + " composants, " + str(vuln_count) + " CVE, " + str(outdated_count) + " obsoletes")
