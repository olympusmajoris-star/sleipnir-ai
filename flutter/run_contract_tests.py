"""Exercise the actual widget's pure-Dart boundary code, not a parallel model.

Usage: python run_contract_tests.py /absolute/path/to/dart
No Flutter tool, package download, cloud metadata request or network is needed.
"""
from pathlib import Path
import subprocess
import sys

here = Path(__file__).resolve().parent
source = (here / 'asgard_studio_surface.dart').read_text()
start = source.index('const asgardStudioRuntimeUrl')
end = source.index('class AsgardStudioSurface extends StatefulWidget')
generated = here / 'contract_under_test.dart'
generated.write_text("import 'dart:convert';\n" + source[start:end])
dart = sys.argv[1]
subprocess.run([dart, 'analyze', str(generated), str(here/'contract_test.dart')], check=True, cwd=here)
subprocess.run([dart, str(here/'contract_test.dart')], check=True, cwd=here)
