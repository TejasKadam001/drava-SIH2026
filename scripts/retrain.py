"""Command-line entry point that runs the full training pipeline."""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from twin_api.training import train_and_evaluate_all

if __name__ == "__main__":
    train_and_evaluate_all()
