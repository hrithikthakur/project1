import random
from typing import Dict, List, Any
from datetime import datetime, timedelta
from collections import defaultdict
import statistics
from ..engine.graph import DependencyGraph
from ..engine.ripple import RippleEffectEngine
from ..data.loader import get_work_items
from ..utils.dates import add_business_days, days_between


class MonteCarloSimulator:
    """Monte Carlo simulation for forecasting work item completion"""
    
    def __init__(self, graph: DependencyGraph, ripple_engine: RippleEffectEngine):
        self.graph = graph
        self.ripple_engine = ripple_engine
        self.work_items = {item["id"]: item for item in get_work_items()}
    
    def simulate(self, num_simulations: int = 1000, 
                 decisions: List[Dict[str, Any]] = None,
                 risks: List[Dict[str, Any]] = None) -> Dict[str, Dict[str, Any]]:
        """
        Run Monte Carlo simulation.
        Returns forecast results for each work item.
        """
        decisions = decisions or []
        risks = risks or []
        
        # Apply decisions and risks
        self.ripple_engine.apply_decisions(decisions)
        self.ripple_engine.apply_risks(risks)
        
        # Get topological order
        topo_order = self.graph.topological_sort()
        
        # Run simulations
        results: Dict[str, List[float]] = defaultdict(list)
        
        for _ in range(num_simulations):
            completion_times = self._run_single_simulation(topo_order)
            for item_id, days in completion_times.items():
                results[item_id].append(days)
        
        # Calculate statistics
        forecast_results = {}
        for item_id, days_list in results.items():
            forecast_results[item_id] = self._calculate_statistics(item_id, days_list)
        
        return forecast_results
    
    def _run_single_simulation(self, topo_order: List[str]) -> Dict[str, float]:
        """Run a single simulation iteration"""
        completion_times: Dict[str, float] = {}
        start_date = datetime.now()
        
        for item_id in topo_order:
            # Get modified item with effects applied
            item = self.ripple_engine.get_modified_item(item_id)
            
            # Base estimated days
            base_days = item.get("estimated_days", 0.0)
            
            # Apply uncertainty (triangular distribution: -20% to +50%)
            uncertainty_factor = random.triangular(0.8, 1.5, 1.0)
            simulated_days = base_days * uncertainty_factor
            
            # Apply delay if any
            delay = self.ripple_engine.item_effects.get(item_id, {}).get("delay_days", 0.0)
            simulated_days += delay
            
            # Calculate start time (max of dependency completion times)
            dependencies = self.graph.get_dependencies(item_id)
            if dependencies:
                max_dep_completion = max(
                    completion_times.get(dep_id, 0.0) 
                    for dep_id in dependencies
                )
                start_offset = max_dep_completion
            else:
                start_offset = 0.0
            
            # Completion time = start offset + simulated days
            completion_times[item_id] = start_offset + simulated_days
        
        return completion_times
    
    def _calculate_statistics(self, item_id: str, days_list: List[float]) -> Dict[str, Any]:
        """Calculate statistics from simulation results"""
        if not days_list:
            return {}
        
        days_list.sort()
        n = len(days_list)
        
        mean = statistics.mean(days_list)
        std_dev = statistics.stdev(days_list) if n > 1 else 0.0
        
        # Calculate percentiles
        percentiles = {
            "p10": days_list[int(n * 0.10)] if n > 0 else 0.0,
            "p50": days_list[int(n * 0.50)] if n > 0 else 0.0,
            "p90": days_list[int(n * 0.90)] if n > 0 else 0.0,
            "p99": days_list[int(n * 0.99)] if n > 0 else 0.0,
        }
        
        earliest = min(days_list)
        latest = max(days_list)
        
        start_date = datetime.now()
        
        return {
            "work_item_id": item_id,
            "percentiles": percentiles,
            "mean": round(mean, 2),
            "std_dev": round(std_dev, 2),
            "earliest_possible": (start_date + timedelta(days=earliest)).isoformat(),
            "latest_possible": (start_date + timedelta(days=latest)).isoformat()
        }

