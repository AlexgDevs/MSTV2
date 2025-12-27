from asyncio import run
from bot import main
import logging

if __name__ == '__main__':
    logging.basicConfig(level=1)
    try:
        run(main())
    except KeyboardInterrupt:
        print('Closed')