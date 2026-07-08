from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "screenshots"
OUT.mkdir(exist_ok=True)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def text_block(draw, xy, text, font_obj, fill, width, line_gap=10):
    x, y = xy
    for line in wrap(text, width=width):
        draw.text((x, y), line, font=font_obj, fill=fill)
        y += font_obj.getbbox(line)[3] + line_gap
    return y


def card(draw, box, title, body, accent="#2856a3", wrap_width=24, body_size=21):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=12, fill="#ffffff", outline="#d8dee8", width=2)
    draw.rectangle((x1, y1, x1 + 8, y2), fill=accent)
    draw.text((x1 + 28, y1 + 24), title, font=font(BOLD, 30), fill="#18212f")
    text_block(draw, (x1 + 28, y1 + 72), body, font(FONT, body_size), "#5e6b7c", width=wrap_width)


def base(title, description):
    image = Image.new("RGB", (1400, 900), "#f7f8fb")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((70, 70, 1330, 830), radius=18, fill="#ffffff", outline="#d8dee8", width=2)
    draw.text((120, 120), "Software Testing and Code Quality", font=font(BOLD, 24), fill="#2856a3")
    draw.text((120, 170), title, font=font(BOLD, 48), fill="#18212f")
    text_block(draw, (120, 245), description, font(FONT, 27), "#5e6b7c", width=72, line_gap=12)
    return image, draw


def save_testing_levels():
    image, draw = base(
        "Testing Levels",
        "Testing is done in layers: small code pieces first, connected parts next, then the full system and final user requirements.",
    )
    items = [
        ("Unit", "Checks one function, component, or module in isolation.", "#2856a3"),
        ("Integration", "Checks that modules work together, such as API plus database.", "#117b63"),
        ("System", "Checks the complete application from end to end.", "#a86d0d"),
        ("Acceptance", "Checks whether the software satisfies user requirements.", "#b0413e"),
    ]
    for index, item in enumerate(items):
        x = 120 + index * 305
        card(draw, (x, 430, x + 270, 685), item[0], item[1], item[2], wrap_width=20)
    image.save(OUT / "testing-levels.png")


def save_automation():
    image, draw = base(
        "Test Automation",
        "Automated tests run the same checks repeatedly after code changes, reducing manual effort and catching regressions early.",
    )
    steps = ["Code", "Build", "Test", "Report", "Fix"]
    for index, step in enumerate(steps):
        x = 135 + index * 235
        draw.rounded_rectangle((x, 455, x + 180, 595), radius=12, fill="#f3faf7", outline="#b9d7cf", width=2)
        draw.text((x + 42, 490), str(index + 1), font=font(BOLD, 34), fill="#117b63")
        draw.text((x + 36, 535), step, font=font(BOLD, 26), fill="#18212f")
        if index < len(steps) - 1:
            draw.line((x + 185, 525, x + 222, 525), fill="#117b63", width=6)
    image.save(OUT / "test-automation.png")


def save_code_reviews():
    image, draw = base(
        "Code Reviews",
        "Another developer checks changes before merging to improve correctness, readability, security, and maintainability.",
    )
    checks = ["Clear names and readable logic", "No obvious bugs or broken flows", "Errors and edge cases handled", "Tests updated where needed"]
    for index, check in enumerate(checks):
        y = 435 + index * 72
        draw.rounded_rectangle((145, y, 190, y + 45), radius=8, outline="#117b63", width=4)
        draw.text((154, y + 3), "✓", font=font(BOLD, 30), fill="#117b63")
        draw.text((215, y + 8), check, font=font(FONT, 27), fill="#18212f")
    draw.rounded_rectangle((760, 425, 1235, 675), radius=12, fill="#111827")
    draw.text((790, 455), "Reviewer: Looks good overall.", font=font(MONO, 23), fill="#d6e2ff")
    draw.text((790, 505), "Suggestion: Add an invalid login test.", font=font(MONO, 23), fill="#ffd27d")
    draw.text((790, 585), "Developer: Added the test and reran checks.", font=font(MONO, 23), fill="#8bd5ca")
    image.save(OUT / "code-reviews.png")


def save_static_analysis():
    image, draw = base(
        "Static Code Analysis",
        "Static analysis scans source code without running the app to find style issues, unsafe patterns, and possible bugs.",
    )
    draw.rounded_rectangle((130, 420, 760, 690), radius=12, fill="#111827")
    lines = [
        ("npm run lint", "#8bd5ca"),
        ("", "#d6e2ff"),
        ("src/controllers/auth.controller.js", "#d6e2ff"),
        ("12:7  warning  Unexpected console statement", "#ffd27d"),
        ("28:5  error    Missing semicolon", "#ff9b9b"),
        ("", "#d6e2ff"),
        ("Fix issues before merging.", "#8bd5ca"),
    ]
    y = 450
    for line, color in lines:
        draw.text((165, y), line, font=font(MONO, 22), fill=color)
        y += 36
    card(draw, (820, 420, 1235, 690), "Tools", "ESLint checks JavaScript, Prettier formats code, and SonarQube can scan deeper quality risks.", "#2856a3", wrap_width=32)
    image.save(OUT / "static-code-analysis.png")


def save_tdd():
    image, draw = base(
        "Test-Driven Development (TDD)",
        "TDD means writing a failing test before implementation, then making it pass and improving the code safely.",
    )
    items = [
        ("Red", "Write a test for the expected behavior. It fails first.", "#b0413e"),
        ("Green", "Write the simplest code needed to make the test pass.", "#117b63"),
        ("Refactor", "Clean up the design while all tests continue passing.", "#a86d0d"),
    ]
    for index, item in enumerate(items):
        x = 150 + index * 390
        card(draw, (x, 430, x + 330, 700), item[0], item[1], item[2], wrap_width=26)
    image.save(OUT / "tdd.png")


if __name__ == "__main__":
    save_testing_levels()
    save_automation()
    save_code_reviews()
    save_static_analysis()
    save_tdd()
