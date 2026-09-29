"""Run every test module under tests/ and exit non-zero on failure."""

import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

suite = unittest.TestLoader().discover(os.path.join(ROOT, "tests"), pattern="test_*.py")
outcome = unittest.TextTestRunner(verbosity=2).run(suite)

banner = "=" * 70
if outcome.wasSuccessful():
    print(f"\n{banner}\n ALL Drava TESTS PASSED SUCCESSFULLY! (ZERO ERRORS)\n{banner}")
    sys.exit(0)

print(f"\n{banner}\n TESTS FAILED!\n{banner}")
sys.exit(1)
