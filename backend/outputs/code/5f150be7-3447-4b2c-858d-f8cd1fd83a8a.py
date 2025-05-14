# Binary Search Animation

from manim import *

class BinarySearchAnimation(Scene):
    def construct(self):
        # Create a sorted list of numbers
        numbers = [2, 4, 7, 9, 11, 14, 16, 18, 20, 23]
        
        # Display the list of numbers
        number_list = Text(str(numbers), font_size=24).to_edge(UP)
        self.play(Write(number_list))
        
        # Prompt for the target number
        prompt = Text("Enter the target number: ", font_size=24).next_to(number_list, DOWN)
        self.play(Write(prompt))
        
        # Simulate user input for the target number
        target_number = 14
        user_input = Text(str(target_number), font_size=24).next_to(prompt, RIGHT)
        self.play(Write(user_input))
        
        # Perform binary search animation
        left = 0
        right = len(numbers) - 1
        
        while left <= right:
            mid = (left + right) // 2
            
            # Highlight the current middle element
            highlight = SurroundingRectangle(number_list[0][mid*3:mid*3+2], color=YELLOW)
            self.play(Create(highlight))
            
            if numbers[mid] == target_number:
                # Target number found
                result = Text(f"Number {target_number} found at index {mid}", font_size=24).next_to(user_input, DOWN)
                self.play(Write(result))
                break
            elif numbers[mid] < target_number:
                # Target number is in the right half
                left = mid + 1
                self.play(highlight.animate.shift(RIGHT * 3))
            else:
                # Target number is in the left half
                right = mid - 1
                self.play(highlight.animate.shift(LEFT * 3))
            
            self.play(FadeOut(highlight))
        
        if left > right:
            # Target number not found
            result = Text(f"Number {target_number} not found", font_size=24).next_to(user_input, DOWN)
            self.play(Write(result))
        
        self.wait(2)