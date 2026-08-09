#!/usr/bin/env python3
"""
tools/update_handoff.py

Generate or update HANDOFF.md from tools/ares-status.json and current git state.
"""
import json
import os
import subprocess
from datetime import datetime

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ARES_STATUS = os.path.join(REPO_ROOT, 'tools', 'ares-status.json')
HANDOFF = os.path.join(REPO_ROOT, 'HANDOFF.md')


def read_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def git(cmd):
    try:
        p = subprocess.run(['git'] + cmd, cwd=REPO_ROOT, capture_output=True, text=True, check=True)
        return p.stdout.strip()
    except Exception:
        return ''


def make_handoff(status):
    timestamp = datetime.now().astimezone().isoformat()
    branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) or status.get('branch', '')
    commit = git(['rev-parse', '--short', 'HEAD'])
    modified = git(['status', '--porcelain'])
    modified_list = [l for l in modified.splitlines() if l]

    handoff_sections = []
    handoff_sections.append('# ARES OMEGA: Session Handoff State')
    handoff_sections.append('')
    handoff_sections.append('## ⏱ Last Session Sync')
    handoff_sections.append(f'* **Timestamp:** {timestamp}')
    handoff_sections.append(f'* **Branch:** {branch}')
    handoff_sections.append(f'* **Last commit:** {commit}')
    handoff_sections.append('')
    handoff_sections.append('## 📍 Current Snapshot State')
    handoff_sections.append('```json')
    handoff_sections.append(json.dumps(status, indent=2))
    handoff_sections.append('```')
    handoff_sections.append('')
    handoff_sections.append('## ✅ Completed in Last Session')
    handoff_sections.append('- [x] See tools/ares-status.json for details')
    handoff_sections.append('')
    handoff_sections.append('## 🚩 Blockers & Active Technical Debt')
    handoff_sections.append('- See tools/ares-status.json -> blockers (if present).')
    handoff_sections.append('')
    handoff_sections.append('## ⏩ Next Immediate Actions (For Incoming Agent)')
    handoff_sections.append('1. Review tools/ares-status.json and tools/workspace-snapshot.json')
    handoff_sections.append('2. Run tests: npm ci && npm test')
    handoff_sections.append('3. Implement highest-priority pending todo from tools/roadmap.json')
    handoff_sections.append('')
    handoff_sections.append('## 🔧 Git Working State')
    handoff_sections.append(f'* Modified files ({len(modified_list)}):')
    handoff_sections.append('\n'.join(f'  - {l}' for l in modified_list) if modified_list else '* None')
    handoff_sections.append('')
    handoff_sections.append('## 🧭 Commands to reproduce environment')
    handoff_sections.append('```bash')
    handoff_sections.append('npm ci')
    handoff_sections.append('npm run typecheck')
    handoff_sections.append('npm test')
    handoff_sections.append('node tools/migrate.ts')
    handoff_sections.append("# enable SQL and run dev server")
    handoff_sections.append("set USE_SQL=1 && npm run local-start  # Windows cmd")
    handoff_sections.append('```')

    return '\n'.join(handoff_sections)


if __name__ == '__main__':
    status = read_json(ARES_STATUS) or {}

    content = make_handoff(status)

    # backup existing HANDOFF.md
    try:
        if os.path.exists(HANDOFF):
            bak = HANDOFF + '.bak'
            with open(HANDOFF, 'r', encoding='utf-8') as f:
                prev = f.read()
            with open(bak, 'w', encoding='utf-8') as f:
                f.write(prev)

        with open(HANDOFF, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Wrote HANDOFF.md')
    except Exception as e:
        print('Failed to write HANDOFF.md:', e)
        raise
