"""Process-wide model instances shared by every router."""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from twin_api.synthetic.synthetic_feed import SyntheticFeed
from twin_api.learners.rate_forecaster import RateForecaster
from twin_api.learners.failure_scorer import FailureScorer
from twin_api.learners.anomaly_watch import FrameWatch
from twin_api.planner.plan_search import PlanSearch
from wellphysics.viscosity import CrudeViscosity
from wellphysics.reservoir_heat import ReservoirHeat
from wellphysics.rod_pump import RodPump
from wellphysics.decline import DeclineCurveAnalyzer
from copilot.router import CopilotRouter

simulator = SyntheticFeed()
prod_forecaster = RateForecaster()
failure_scorer = FailureScorer()
anomaly_watch = FrameWatch()
optimizer = PlanSearch()
visc_model = CrudeViscosity()
reservoir_heat = ReservoirHeat()
rod_pump = RodPump()
decline = DeclineCurveAnalyzer()
agent = CopilotRouter()
