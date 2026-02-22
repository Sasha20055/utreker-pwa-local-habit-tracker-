#!/usr/bin/env python3
import argparse
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PLAN_FILE = ROOT / "PLAN.md"


def read_plan():
    if not PLAN_FILE.exists():
        return {"doing": [], "done": []}
    text = PLAN_FILE.read_text(encoding="utf-8")
    doing = []
    done = []
    section = None
    for line in text.splitlines():
        if line.strip().lower().startswith("## doing"):
            section = "doing"
            continue
        if line.strip().lower().startswith("## done"):
            section = "done"
            continue
        if section and line.strip().startswith("- "):
            item = line.strip()[2:]
            if section == "doing":
                doing.append(item)
            else:
                done.append(item)
    return {"doing": doing, "done": done}


def write_plan(data):
    lines = []
    lines.append("# PLAN")
    lines.append("")
    lines.append("## Doing")
    lines.append("")
    if data["doing"]:
        for it in data["doing"]:
            lines.append(f"- {it}")
    else:
        lines.append("- (none)")
    lines.append("")
    lines.append("## Done")
    lines.append("")
    if data["done"]:
        for it in data["done"]:
            lines.append(f"- {it}")
    else:
        lines.append("- (none)")
    lines.append("")
    PLAN_FILE.write_text("\n".join(lines), encoding="utf-8")


def start_feature(title):
    data = read_plan()
    timestamp = datetime.utcnow().isoformat() + "Z"
    entry = f"{title} (started: {timestamp})"
    if any(entry.startswith(title) or title in d for d in data["doing"]):
        print("Feature already in Doing")
        return
    data["doing"].append(entry)
    write_plan(data)
    print(f"Started: {entry}")


def finish_feature(title):
    data = read_plan()
    matched = None
    for d in data["doing"]:
        if d.lower().startswith(title.lower()):
            matched = d
            break
    if not matched:
        # try fuzzy match by substring
        for d in data["doing"]:
            if title.lower() in d.lower():
                matched = d
                break
    if not matched:
        print("Feature not found in Doing")
        return
    data["doing"].remove(matched)
    timestamp = datetime.utcnow().isoformat() + "Z"
    done_entry = f"{matched} -> completed: {timestamp}"
    data["done"].append(done_entry)
    write_plan(data)
    print(f"Finished: {done_entry}")


def status():
    print(
        (
            PLAN_FILE.read_text(encoding="utf-8")
            if PLAN_FILE.exists()
            else "No PLAN.md found"
        )
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=str, help="Start a feature with title")
    parser.add_argument("--finish", type=str, help="Finish a feature with title")
    parser.add_argument("--status", action="store_true", help="Show PLAN.md")
    args = parser.parse_args()
    if args.start:
        start_feature(args.start)
    elif args.finish:
        finish_feature(args.finish)
    elif args.status:
        status()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
