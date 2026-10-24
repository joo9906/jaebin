import re
from urllib.parse import urlsplit

from .settings import CONFIG, PRIORITY


def has_word(text, word):
    if not word.strip():
        return False
    if re.fullmatch(r"[a-z0-9 ]+", word, re.I):
        return bool(re.search(r"(?<![a-z0-9])" + re.escape(word) + r"(?![a-z0-9])", text, re.I))
    return word.lower() in text.lower()


def keyword_match(title, source):
    if source.get("status") != "사용":
        return []
    matches = []
    for rule in CONFIG["rules"]:
        if rule["status"] != "사용" or rule["category"] not in source["categories"]:
            continue
        main = [word for word in rule["main"] if has_word(title, word)]
        if not main or any(has_word(title, word) for word in rule["excluded"]):
            continue
        auxiliary = [word for word in rule["auxiliary"] if has_word(title, word)]
        matches.append({**rule, "mainMatches": main, "auxiliaryMatches": auxiliary,
                        "matchLevel": "full" if auxiliary or not rule["auxiliary"] else "main"})
    matches.sort(key=lambda r: (PRIORITY[r["category"]], r["matchLevel"] != "full"))
    return [r for r in matches if r["category"] == matches[0]["category"]] if matches else []


def selection_level(groups):
    return "full" if any(r["matchLevel"] == "full" for r in groups) else "main" if groups else "none"


def article_tags(groups):
    return list(dict.fromkeys(word for r in groups for word in r["mainMatches"] + r["auxiliaryMatches"]))[:12]


def selection(title, source):
    groups = keyword_match(title, source)
    names = {c["id"]: c["name"] for c in CONFIG["categories"]}
    reasons = [names[r["category"]] + " · " + ", ".join(r["mainMatches"][:3]) +
               (" + " + ", ".join(r["auxiliaryMatches"][:3]) if r["auxiliaryMatches"] else "") +
               " · " + r["id"] for r in groups]
    return {"selected": bool(groups), "level": selection_level(groups), "reasons": reasons}


def host_of(url):
    return (urlsplit(url).hostname or "").removeprefix("www.")
