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
        target_text = Text(f"Target: {target}").scale(0.7).next_to(list_text, DOWN)
        self.play(Write(target_text))
        self.wait(1)
        
        # Perform binary search
        left = 0
        right = len(sorted_list) - 1
        
        while left <= right:
            mid = (left + right) // 2
            mid_text = Text(f"Mid: {sorted_list[mid]}").scale(0.7).next_to(target_text, DOWN)
            self.play(Write(mid_text))
            self.wait(1)
            
            if sorted_list[mid] == target:
                found_text = Text(f"Found at index {mid}!").scale(0.7).next_to(mid_text, DOWN)
                self.play(Write(found_text), mid_text.animate.set_color(GREEN))
                self.wait(2)
                break
            elif sorted_list[mid] < target:
                left_text = Text(f"Target is greater, search right half").scale(0.5).next_to(mid_text, DOWN)
                self.play(Write(left_text))
                self.wait(1)
                left = mid + 1
                self.play(FadeOut(mid_text), FadeOut(left_text))
            else:
                right_text = Text(f"Target is smaller, search left half").scale(0.5).next_to(mid_text, DOWN)
                self.play(Write(right_text))
                self.wait(1)
                right = mid - 1
                self.play(FadeOut(mid_text), FadeOut(right_text))
        
        if left > right:
            not_found_text = Text("Target not found").scale(0.7).next_to(target_text, DOWN)
            self.play(Write(not_found_text))
            self.wait(2)