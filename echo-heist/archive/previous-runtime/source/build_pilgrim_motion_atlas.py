from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "woven-reliquary" / "pilgrim-motion"
FACINGS = ("down", "up", "left", "right")
FRAME_SIZE = 256
SUBJECT_HEIGHT = 218
WALK_X = (0, -5, -2, 4, 1, 5)
WALK_Y = (0, 4, 1, -3, 0, 4)
WALK_SX = (1.00, 0.96, 0.985, 1.035, 1.01, 0.965)
WALK_SY = (1.00, 1.035, 1.01, 0.965, 0.99, 1.03)
WALK_ROTATION = (-1.4, 1.8, 0.7, -1.9, -0.6, 1.3)


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Directional master has no visible pixels")
    return bbox


def transform_subject(
    subject: Image.Image,
    scale_x: float,
    scale_y: float,
    rotation: float,
    opacity: float = 1.0,
) -> Image.Image:
    width = max(1, round(subject.width * scale_x))
    height = max(1, round(subject.height * scale_y))
    transformed = subject.resize((width, height), Image.Resampling.LANCZOS)
    transformed = transformed.rotate(
        rotation,
        resample=Image.Resampling.BICUBIC,
        expand=True,
    )
    if opacity < 1:
        alpha = ImageEnhance.Brightness(transformed.getchannel("A")).enhance(opacity)
        transformed.putalpha(alpha)
    return transformed


def compose_frame(
    subject: Image.Image,
    scale_x: float,
    scale_y: float,
    rotation: float,
    offset_x: int,
    offset_y: int,
    opacity: float = 1.0,
) -> Image.Image:
    transformed = transform_subject(subject, scale_x, scale_y, rotation, opacity)
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    foot_y = 239 + offset_y
    x = (FRAME_SIZE - transformed.width) // 2 + offset_x
    y = foot_y - transformed.height
    frame.alpha_composite(transformed, (x, y))
    return frame


def build() -> None:
    columns = 12  # 0-5 walk, 6-8 idle, 9-10 turn, 11 echo hold
    atlas = Image.new(
        "RGBA",
        (FRAME_SIZE * columns, FRAME_SIZE * len(FACINGS)),
        (0, 0, 0, 0),
    )

    for row, facing in enumerate(FACINGS):
        master = Image.open(ASSET_DIR / f"pilgrim-{facing}.png").convert("RGBA")
        master = master.crop(alpha_bbox(master))
        base_width = max(1, round(master.width * (SUBJECT_HEIGHT / master.height)))
        master = master.resize((base_width, SUBJECT_HEIGHT), Image.Resampling.LANCZOS)

        frames: list[Image.Image] = []
        for index in range(6):
            direction_bias = -1 if facing in ("left", "up") else 1
            frames.append(
                compose_frame(
                    master,
                    WALK_SX[index],
                    WALK_SY[index],
                    WALK_ROTATION[index] * direction_bias,
                    WALK_X[index] * direction_bias,
                    WALK_Y[index],
                ),
            )

        # Idle breath: cloak settles, mask dips, then returns.
        frames.extend(
            (
                compose_frame(master, 1.0, 1.0, -0.35, 0, 0),
                compose_frame(master, 1.018, 0.982, 0.35, 0, 2),
                compose_frame(master, 0.994, 1.008, 0, 0, -1),
            ),
        )

        # Turn anticipation and recovery. These are selected briefly when facing changes.
        turn_sign = -1 if facing in ("left", "up") else 1
        frames.extend(
            (
                compose_frame(master, 0.91, 1.025, -4.8 * turn_sign, -3 * turn_sign, 2),
                compose_frame(master, 1.055, 0.965, 3.2 * turn_sign, 3 * turn_sign, 1),
            ),
        )

        # Echo hold: a calm compressed pose used once replay reaches its final sample.
        frames.append(compose_frame(master, 1.035, 0.968, 0, 0, 3, 0.94))

        for column, frame in enumerate(frames):
            atlas.alpha_composite(frame, (column * FRAME_SIZE, row * FRAME_SIZE))

    output = ASSET_DIR / "memory-pilgrim-motion-atlas.png"
    atlas.save(output, optimize=True)
    print(f"Wrote {output} ({atlas.width}x{atlas.height}, RGBA)")


if __name__ == "__main__":
    build()
