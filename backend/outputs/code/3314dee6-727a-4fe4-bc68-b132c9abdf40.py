# Bubble Sort Mechanism Explained
from manim import *

class BubbleSortScene(Scene):
    def construct(self):
        # Create an unsorted list
        unsorted_list = [5, 2, 8, 12, 1, 6]
        
        # Create Text objects for the list elements
        list_text = VGroup(*[Text(str(num)) for num in unsorted_list])
        list_text.arrange(RIGHT, buff=0.5)
        
        # Display the unsorted list
        self.play(Write(list_text))
        self.wait()
        
        # Perform bubble sort
        n = len(unsorted_list)
        for i in range(n - 1):
            for j in range(n - i - 1):
                # Highlight the elements being compared
                self.play(
                    list_text[j].animate.set_color(RED),
                    list_text[j + 1].animate.set_color(RED),
                )
                self.wait(0.5)
                
                if unsorted_list[j] > unsorted_list[j + 1]:
                    # Swap the elements
                    unsorted_list[j], unsorted_list[j + 1] = unsorted_list[j + 1], unsorted_list[j]
                    self.play(
                        list_text[j].animate.move_to(list_text[j + 1]),
                        list_text[j + 1].animate.move_to(list_text[j]),
                    )
                
                # Reset the color of the elements
                self.play(
                    list_text[j].animate.set_color(WHITE),
                    list_text[j + 1].animate.set_color(WHITE),
                )
                self.wait(0.5)
        
        # Display the sorted list
        self.play(list_text.animate.set_color(GREEN))
        self.wait(2)