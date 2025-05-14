
# Binary Tree Visualization Demo

from manim import *

class BinaryTreeDemo(Scene):
    def construct(self):
        # Create title
        title = Text("Binary Tree Basics", font_size=40)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create the root node
        root = Circle(radius=0.5).set_stroke(WHITE, 2)
        root_text = Text("5", font_size=24)
        root_group = VGroup(root, root_text)
        root_group.move_to([0, 2, 0])
        
        # Create left child
        left = Circle(radius=0.5).set_stroke(WHITE, 2)
        left_text = Text("3", font_size=24)
        left_group = VGroup(left, left_text)
        left_group.move_to([-2, 0, 0])
        
        # Create right child
        right = Circle(radius=0.5).set_stroke(WHITE, 2)
        right_text = Text("7", font_size=24)
        right_group = VGroup(right, right_text)
        right_group.move_to([2, 0, 0])
        
        # Create edges
        edge1 = Line(root_group.get_bottom(), left_group.get_top())
        edge2 = Line(root_group.get_bottom(), right_group.get_top())
        
        # Animate the tree construction
        self.play(Create(root_group))
        self.wait(0.5)
        
        self.play(
            Create(edge1),
            Create(edge2)
        )
        self.wait(0.5)
        
        self.play(
            Create(left_group),
            Create(right_group)
        )
        
        # Add explanation text
        explanation = Text(
            "A binary tree where each node has at most 2 children",
            font_size=24,
            color=YELLOW
        )
        explanation.next_to(title, DOWN, buff=0.5)
        self.play(Write(explanation))
        
        self.wait(2)
