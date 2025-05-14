Here is the Python code for a Binary Search animation using Manim CE:
```
from manim import *

class BinarySearch(Scene):
    def construct(self):
        # Title
        title = Text("Binary Search", font_size=40)
        self.play(Write(title))
        self.wait(1)
        self.play(Uncreate(title))

        # Array
        arr = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]
        arr_mob = VGroup(*[Text(str(x)) for x in arr])
        arr_mob.arrange(RIGHT, buff=0.5)
        self.play(Write(arr_mob))

        # Target
        target = 21
        target_mob = Text(str(target), color=YELLOW)
        self.play(Write(target_mob))

        # Binary Search
        low, high = 0, len(arr) - 1
        while low <= high:
            mid = (low + high) // 2
            mid_mob = Circle(color=GREEN, radius=0.2).move_to(arr_mob[mid])
            self.play(Create(mid_mob))
            self.wait(0.5)

            if arr[mid] == target:
                self.play(Indicate(mid_mob))
                break
            elif arr[mid] < target:
                low = mid + 1
                self.play(Uncreate(mid_mob))
            else:
                high = mid - 1
                self.play(Uncreate(mid_mob))

        self.wait(2)
```
Save this code as a `binary_search.py` file and run it with Manim CE using `manim -p -c WHITE binary_search.py`.