"""Copy an actual Cubism Editor export and attach provisional parameter motions.

Does not synthesize or modify MOC3. Re-run after each export from the editor.
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).parent / "build" / "editor-export"
TARGET = ROOT / "public" / "models" / "changli" / "live-editor"


def motion(curves, duration):
    result = []
    for param, points in curves.items():
        segments = list(points[0])
        for time, value in points[1:]:
            segments.extend([0, time, value])
        result.append({"Target": "Parameter", "Id": param, "Segments": segments})
    return {
        "Version": 3,
        "Meta": {
            "Duration": duration, "Fps": 30, "Loop": False,
            "AreBeziersRestricted": True, "CurveCount": len(result),
            "TotalSegmentCount": sum(len(p) - 1 for p in curves.values()),
            "TotalPointCount": sum(len(p) for p in curves.values()),
            "UserDataCount": 0, "TotalUserDataSize": 0,
            "FadeInTime": 0.05, "FadeOutTime": 0.05,
        },
        "Curves": result, "UserData": [],
    }


def main():
    moc = SOURCE / "ChangliEditor.moc3"
    if not moc.is_file() or moc.read_bytes()[:4] != b"MOC3":
        raise ValueError("Export ChangliEditor.moc3 from Cubism Editor first")
    shutil.copytree(SOURCE, TARGET, dirs_exist_ok=True)
    blink = [(0, 1), (0.15, 1), (0.25, 0), (0.33, 0), (0.48, 1), (0.65, 1)]
    motions = {
        "Blink": motion({"ParamEyeLOpen": blink, "ParamEyeROpen": blink}, 0.65),
        "Sway": motion({"ParamAngleZ": [(0, 0), (0.6, -20), (1.4, 20), (2.2, 0)]}, 2.2),
        "Mouth": motion({"ParamMouthOpenY": [(0, 0), (0.2, 0), (0.45, 0.5), (0.7, 1), (0.85, 1), (1.1, 0.5), (1.35, 0), (1.5, 0)]}, 1.5),
    }
    manifest_path = TARGET / "ChangliEditor.model3.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    manifest["FileReferences"]["Motions"] = {}
    for name, data in motions.items():
        filename = f"{name.lower()}.motion3.json"
        (TARGET / filename).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        manifest["FileReferences"]["Motions"][name] = [{"File": filename}]
    manifest["Groups"] = [{"Target": "Parameter", "Name": "EyeBlink", "Ids": ["ParamEyeLOpen", "ParamEyeROpen"]}]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Copied official Editor MOC3 ({moc.stat().st_size} bytes); added {len(motions)} provisional motions")


if __name__ == "__main__":
    main()
