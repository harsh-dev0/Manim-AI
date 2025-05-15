# Binary Search Technique Explanation
from manim import *

class BinarySearchExplanation(Scene):
    def construct(self):
        # Create a sorted list
        sorted_list = [2, 4, 7, 10, 13, 16, 19, 22, 25, 28]
        list_text = Text(str(sorted_list)).scale(0.7)
        self.play(Write(list_text))
        self.wait(1)
        
        # Explain the binary search process
        steps_title = Text("Binary Search Steps:").scale(0.8).to_edge(UP)
        self.play(Write(steps_title))
        
        steps = [
            "1. Compare the target value with the middle element.",
            "2. If the target value matches the middle element, return the index.",
            "3. If the target value is greater, search the right half.",
            "4. If the target value is smaller, search the left half.",
            "5. Repeat steps 1-4 until the element is found or the list is exhausted."
        ]
        
        step_texts = VGroup(*[Text(step).scale(0.5) for step in steps]).arrange(DOWN, aligned_edge=LEFT).next_to(steps_title, DOWN)
        
        for step_text in step_texts:
            self.play(Write(step_text))
            self.wait(1)
        
        # Demonstrate the binary search process
        target = 16
        target_text = Text(f"Target: {target}").scale(0.7).to_edge(DOWN)
        self.play(Write(target_text))
        
        left = 0
        right = len(sorted_list) - 1
        
        while left <= right:
            mid = (left + right) // 2
            mid_text = Text(f"Middle index: {mid}").scale(0.6).next_to(target_text, UP)
            self.play(Write(mid_text))
            self.wait(1)
            
            if sorted_list[mid] == target:
                found_text = Text(f"Target {target} found at index {mid}!").scale(0.7).next_to(mid_text, UP)
                self.play(Write(found_text), list_text[mid].animate.set_color(GREEN))
                self.wait(2)
                break
            elif sorted_list[mid] < target:
                left = mid + 1
                self.play(list_text[:mid+1].animate.set_color(RED), mid_text.animate.set_color(RED))
            else:
                right = mid - 1
                self.play(list_text[mid:].animate.set_color(RED), mid_text.animate.set_color(RED))
            
            self.wait(1)
            self.play(FadeOut(mid_text))
        
        self.wait(2)