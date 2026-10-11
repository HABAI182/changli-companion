"""Publish the official cuff refinement export, retaining the verified local physics."""
from pathlib import Path
from prepare_tail_runtime import prepare

HERE = Path(__file__).resolve().parent

if __name__ == '__main__':
    prepare(HERE / 'build/editor-export-cuffs-20260927',
            HERE.parents[1] / 'public/models/changli/live-cuffs-draft',
            'ChangliCuffs')
