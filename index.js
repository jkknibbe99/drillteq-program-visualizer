let file_index = 0;
let fileList, fileInput, next_btn, prev_btn, part_name_elem;
const reader = new FileReader();
let part_length, part_width, part_name;
let drill_ops = [];

// dowel clearance (purely visual)
const dowel_clrnc = 1;  // mm

const ZOOM_FACTOR = 1.1;  // zoom factor per mouse wheel event

let isPanning = false;
let panStartPoint;


/**
 * Load/draw next file
 */
function nextFile() {
    file_index++;
    reader.readAsText(fileList[file_index]);
}


/**
 * Load/draw previous file
 */
function prevFile() {
    file_index--;
    reader.readAsText(fileList[file_index]);
}


/**
 * Draw the part
 * @param {float} part_width - part width in mm
 * @param {float} part_length - part length in mm
 */
function drawPart(part_width, part_length) {
    // Draw part
    const part_rec = new paper.Path.Rectangle(0, 0, part_width, part_length);
    part_rec.fillColor = '#a5ccff';
    part_rec.strokeColor = 'black';
    part_rec.strokeWidth = 2;
}


/**
 * Draw drilling operations on the part
 * @param {string} text - Text content of the program file
 */
function drawDrillingOps(text) {
    // Create array of drilling operations
    const matches = text.matchAll(/Komponente\\([\S\s]+?)KO="/g);
    for (const match of matches) {
        let drill_op = {};
        const op_text = match[1];
        drill_op.edge = parseInt(/VA="Edge (\d)"/g.exec(op_text)[1]);  // get edge number
        drill_op.pos = parseFloat(/VA="Pos (\d+\.?\d+)"/g.exec(op_text)[1]);  // get hole position
        drill_op.zpos = parseFloat(/VA="ZPos (\d+\.?\d+)"/g.exec(op_text)[1]);  // get hole z position
        drill_op.dia = parseFloat(/VA="Diameter (\d+\.?\d+)"/g.exec(op_text)[1]);  // get hole diameter
        drill_op.drill_depth = parseFloat(/VA="depth (\d+\.?\d+)"/g.exec(op_text)[1]);  // get drilling depth
        drill_op.dowel = parseInt(/VA="dowel (\d+)"/g.exec(op_text)[1]);  // get dowel
        drill_op.dowel_length = parseFloat(/VA="DLength (\d+\.?\d+)"/g.exec(op_text)[1]);  // get dowel length
        drill_ops.push(drill_op);  // Add drill_op to drill_ops
    }
    // Draw drilling
    // Edges -> 1: left, 2: top, 3: right, 4: bottom
    for (const drill_op of drill_ops) {
        let Xorig, Yorig, width, length;
        if (drill_op.edge === 1) {
            Xorig = 0;
            Yorig = drill_op.pos;
            width = drill_op.drill_depth;
            length = drill_op.dia;
        } else if (drill_op.edge === 2) {
            Xorig = drill_op.pos;
            Yorig = 0;
            width = drill_op.dia;
            length = drill_op.drill_depth;
        } else if (drill_op.edge === 3) {
            Xorig = part_width - drill_op.drill_depth;
            Yorig = drill_op.pos;
            width = drill_op.drill_depth;
            length = drill_op.dia;
        } else if (drill_op.edge === 4) {
            Xorig = drill_op.pos;
            Yorig = part_length - drill_op.drill_depth;
            width = drill_op.dia;
            length = drill_op.drill_depth;
        } else {
            throw Error(`Unexpected drill_op edge (${drill_op.edge})`)
        }
        const drill_rec = new paper.Path.Rectangle(Xorig, Yorig, width, length);
        drill_rec.strokeColor = 'black';
        drill_rec.strokeWidth = 1;
        drill_rec.dashArray = [4, 2];
        // Draw dowel
        if (drill_op.dowel === 1) {
            const dowel_rec_xorig = [1, 3].includes(drill_op.edge) ? Xorig - (drill_op.edge === 1 ? (drill_op.dowel_length - drill_op.drill_depth) : 0) : Xorig + dowel_clrnc;
            const dowel_rec_yorig = [1, 3].includes(drill_op.edge) ? Yorig + dowel_clrnc : Yorig - (drill_op.edge === 2 ? (drill_op.dowel_length - drill_op.drill_depth) : 0);
            const dowel_rec_width = [1, 3].includes(drill_op.edge) ? drill_op.dowel_length : width - dowel_clrnc * 2;
            const dowel_rec_length = [1, 3].includes(drill_op.edge) ? length - dowel_clrnc * 2 : drill_op.dowel_length;
            const dowel_rec = new paper.Path.Rectangle(dowel_rec_xorig, dowel_rec_yorig, dowel_rec_width, dowel_rec_length);
            dowel_rec.strokeColor = 'black';
            dowel_rec.fillColor = '#b3ffc8ff';
            dowel_rec.strokeWidth = 1;
        }
    }
}


async function loadSampleFile() {
    const filename = 'sample.mpr';
    const resp = await fetch(`/${filename}`);
    const blob = await resp.blob();
    const file = new File([blob], filename, {type: blob.type});
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change'));
}


// Code to execute once a file is read
reader.onload = function (e) {
    const text = e.target.result;
    // Clear the canvas
    paper.project.clear();
    // Reset view transformations
    paper.view.matrix = new paper.Matrix();
    // clear drill_ops array
    drill_ops = [];
    // Find part size
    part_length = parseFloat(/l="(\d+\.?\d+)"/g.exec(text)[1]);
    part_width = parseFloat(/w="(\d+\.?\d+)"/g.exec(text)[1]);
    // Find part name
    part_name = /Kommentar\\[\S\s]+KM=[\S\s]+KM=[\S\s]+KM="(.*)"/g.exec(text)[1];
    part_name_elem.innerHTML = part_name;
    // Show prev/next buttons
    if (fileList.length > 1) {
        prev_btn.style.display = 'inline';
        next_btn.style.display = 'inline';
        next_btn.disabled = false;
        prev_btn.disabled = false;
        if (fileList.length == file_index + 1) {
            next_btn.disabled = true;
        }
        if (file_index == 0) {
            prev_btn.disabled = true;
        }
    }
    // Draw part
    drawPart(part_width, part_length);
    drawDrillingOps(text);
    paper.view.draw();
    // Center content
    let bounds = paper.project.activeLayer.bounds;
    const offsetX = canvas.offsetWidth / 2 - (bounds.width / 2 + bounds.x);
    const offsetY = canvas.offsetHeight / 2 - (bounds.height / 2 + bounds.y);
    paper.view.translate(offsetX, offsetY);

    // Scale if content exceeds canvas size
    const padding = 20;
    let new_zoom = 1;
    if (bounds.height > canvas.offsetHeight) {
        new_zoom = canvas.offsetHeight / (bounds.height + padding * 2);
    }
    if (bounds.width > canvas.offsetWidth) {
        new_zoom = Math.min(new_zoom, canvas.offsetWidth / (bounds.width + padding * 2));
    }
    paper.view.zoom = new_zoom;
}


// Code to execute once DOM is loaded
window.onload = function () {
    fileInput = document.querySelector('#fileInput');
    part_name_elem = document.querySelector('#partName');
    next_btn = document.querySelector('#next-program-btn');
    prev_btn = document.querySelector('#prev-program-btn');

    var canvas = document.getElementById('canvas');
    // Update drawing buffer so graphics aren't squished
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    // Set up paperjs on canvas
    paper.setup(canvas);

    // Drag to pan
    canvas.addEventListener('mousedown', function (e) {
        isPanning = true;
        panStartPoint = new paper.Point(e.offsetX, e.offsetY);
    });
    canvas.addEventListener('mousemove', function (e) {
        if (isPanning) {
            const newPoint = new paper.Point(e.offsetX, e.offsetY);
            const delta = panStartPoint.subtract(newPoint);
            paper.view.center = paper.view.center.add(delta.multiply(1 / paper.view.zoom));
            panStartPoint = newPoint;
        }
    });
    canvas.addEventListener('mouseup', function (e) {
        isPanning = false;
    });
    canvas.addEventListener('mouseleave', function (e) {
        isPanning = false;
    });

    // Scroll to zoom
    canvas.addEventListener('wheel', function (e) {
        e.preventDefault();
        // Store previous view state.
        var oldZoom = paper.view.zoom;
        var oldCenter = paper.view.center;

        // Get mouse position.
        // It needs to be converted into project coordinates system.
        var mousePosition = paper.view.viewToProject(new paper.Point(e.offsetX, e.offsetY));

        // Update view zoom.
        var newZoom = e.deltaY > 0 ?
            oldZoom / ZOOM_FACTOR :
            oldZoom * ZOOM_FACTOR;
        paper.view.zoom = newZoom;

        // Update view position.
        paper.view.center = oldCenter.add(mousePosition.subtract(oldCenter).multiply((1 - (oldZoom / newZoom))));
    })
    
    // When new file(s) selected
    fileInput.addEventListener('change', function () {
        // Clear the canvas
        paper.project.clear();
        paper.view.matrix = new paper.Matrix(); // Reset view transformations
        // Hide prev/next buttons
        next_btn.style.display = 'none';
        prev_btn.style.display = 'none';
        // Clear part name
        part_name_elem.innerHTML = 'No Part Loaded';
        // Get files and read them
        fileList = this.files;
        file_index = 0;
        reader.readAsText(fileList[file_index]);
    });
}