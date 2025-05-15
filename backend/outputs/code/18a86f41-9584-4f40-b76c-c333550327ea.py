# Binary Search Explanation
from manim import *

class BinarySearchScene(Scene):
    def construct(self):
        # Create a sorted list
        sorted_list = [2, 4, 7, 10, 13, 16, 19, 22, 25, 28]
        list_text = Text(str(sorted_list)).scale(0.7)
        self.play(Write(list_text))
        self.wait(1)
        
        # Explain the target value
        target = 16
        target_text = Text(f"Target: {target}").next_to(list_text, DOWN)
        self.play(Write(target_text))
        self.wait(1)
        
        # Perform binary search
        left = 0
        right = len(sorted_list) - 1
        
        while left <= right:
            mid = (left + right) // 2
            mid_text = Text(f"Mid: {sorted_list[mid]}").next_to(target_text, DOWN)
            self.play(Write(mid_text))
            self.wait(1)
            
            if sorted_list[mid] == target:
                found_text = Text(f"Found {target} at index {mid}").next_to(mid_text, DOWN)
                self.play(Write(found_text), list_text[mid].animate.set_color(GREEN))
                self.wait(2)
                break
            elif sorted_list[mid] < target:
                left_text = Text(f"Target is greater than {sorted_list[mid]}").next_to(mid_text, DOWN)
                self.play(Write(left_text), list_text[:mid+1].animate.set_color(RED))
                self.wait(1)
                self.remove(left_text)
                left = mid + 1
            else:
                right_text = Text(f"Target is smaller than {sorted_list[mid]}").next_to(mid_text, DOWN)
                self.play(Write(right_text), list_text[mid:].animate.set_color(RED))
                self.wait(1)
                self.remove(right_text)
                right = mid - 1
            
            self.remove(mid_text)
        
        if left > right:
            not_found_text = Text(f"{target} not found in the list").next_to(target_text, DOWN)
            self.play(Write(not_found_text))
            self.wait(2)