from typing import Dict, List, Set
from collections import defaultdict, deque
from ..data.loader import get_work_items, get_dependencies


class DependencyGraph:
    """Builds and manages dependency DAG for work items"""
    
    def __init__(self):
        self.work_items = {item["id"]: item for item in get_work_items()}
        self.dependencies = get_dependencies()
        self.graph: Dict[str, List[str]] = defaultdict(list)
        self.reverse_graph: Dict[str, List[str]] = defaultdict(list)
        self._build_graph()
    
    def _build_graph(self):
        """Build adjacency lists for dependency graph"""
        for dep in self.dependencies:
            from_id = dep.get("from_id")
            to_id = dep.get("to_id")
            if from_id and to_id:
                self.graph[to_id].append(from_id)  # to_id must complete before from_id
                self.reverse_graph[from_id].append(to_id)
        
        # Also include dependencies from work items themselves
        for item_id, item in self.work_items.items():
            deps = item.get("dependencies", [])
            for dep_id in deps:
                self.graph[dep_id].append(item_id)
                self.reverse_graph[item_id].append(dep_id)
    
    def get_dependencies(self, item_id: str) -> List[str]:
        """Get all items that this item depends on"""
        return self.graph.get(item_id, [])
    
    def get_dependents(self, item_id: str) -> List[str]:
        """Get all items that depend on this item"""
        return self.reverse_graph.get(item_id, [])
    
    def topological_sort(self) -> List[str]:
        """Return work items in topological order"""
        in_degree = defaultdict(int)
        for item_id in self.work_items:
            in_degree[item_id] = len(self.get_dependencies(item_id))
        
        queue = deque([item_id for item_id, degree in in_degree.items() if degree == 0])
        result = []
        
        while queue:
            item_id = queue.popleft()
            result.append(item_id)
            
            for dependent_id in self.get_dependents(item_id):
                in_degree[dependent_id] -= 1
                if in_degree[dependent_id] == 0:
                    queue.append(dependent_id)
        
        return result
    
    def get_all_ancestors(self, item_id: str) -> Set[str]:
        """Get all ancestors (transitive dependencies) of an item"""
        ancestors = set()
        queue = deque([item_id])
        visited = set()
        
        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            
            for dep_id in self.get_dependencies(current):
                if dep_id not in ancestors:
                    ancestors.add(dep_id)
                    queue.append(dep_id)
        
        return ancestors

