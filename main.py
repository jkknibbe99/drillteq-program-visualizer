
from tkinter.filedialog import askopenfilename
from tkinter.tix import Tk
import eel
import random
from tkinter import Tk
from tkinter.filedialog import askopenfilename


@eel.expose
def random_int(low, high):
    num = random.randint(low, high)
    print(num)
    eel.showNumber(num)


@eel.expose
def file_dialog():
    print('test')
    # Tk().withdraw() # we don't want a full GUI, so keep the root window from appearing
    filename = askopenfilename() # show an "Open" dialog box and return the path to the selected file
    print(filename)


# Start app --> Render HTML
eel.init("www")
eel.start("index.html")
