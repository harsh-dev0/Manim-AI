Here's a Manim animation that explains the bubble sort mechanism:

from manim import *

class BubbleSortExplanation(Scene):
    def construct(self):
        # Title
        title = Text("Bubble Sort Explanation").scale(1.5)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(1)

        # Unsorted array
        unsorted_array = [5, 3, 8, 4, 2]
        unsorted_text = Text("Unsorted Array:")
        unsorted_text.next_to(title, DOWN, buff=0.5)
        unsorted_numbers = VGroup(*[Integer(num) for num in unsorted_array])
        unsorted_numbers.arrange(RIGHT, buff=0.5)
        unsorted_numbers.next_to(unsorted_text, DOWN)
        self.play(Write(unsorted_text), FadeIn(unsorted_numbers))
        self.wait(1)

        # Bubble sort explanation
        explanation = VGroup(
            Text("1. Compare adjacent elements"),
            Text("2. Swap if left element is greater"),
            Text("3. Repeat until array is sorted")
        )
        explanation.arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        explanation.next_to(unsorted_numbers, DOWN, buff=1)
        for line in explanation:
            self.play(Write(line))
            self.wait(0.5)
        self.wait(1)

        # Bubble sort animation
        sorted_numbers = unsorted_numbers.copy()
        for i in range(len(unsorted_array)):
            for j in range(len(unsorted_array) - 1 - i):
                if sorted_numbers[j].get_value() > sorted_numbers[j + 1].get_value():
                    self.play(
                        sorted_numbers[j].animate.move_to(sorted_numbers[j + 1]),
                        sorted_numbers[j + 1].animate.move_to(sorted_numbers[j]),
                        run_time=0.5
                    )
                    sorted_numbers[j], sorted_numbers[j + 1] = sorted_numbers[j + 1], sorted_numbers[j]
                else:
                    self.play(
                        Indicate(sorted_numbers[j]),
                        Indicate(sorted_numbers[j + 1]),
                        run_time=0.5
                    )
        self.wait(1)

        # Sorted array
        sorted_text = Text("Sorted Array:")
        sorted_text.move_to(unsorted_text)
        self.play(Transform(unsorted_text, sorted_text), Transform(unsorted_numbers, sorted_numbers))
        self.wait(2)