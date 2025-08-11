// Only executed our code once the DOM is ready.
window.onload = function () {
    const part_name_elem = document.querySelector('#partName');

    var canvas = document.getElementById('canvas');
    paper.setup(canvas);
    const part_orig_x = 100;
    const part_orig_y = 100;


    document.querySelector('#gcodeFileInput').addEventListener('change', function () {
        // Clear the canvas
        paper.project.clear();
        // Get files and read them
        const gcodeFileList = this.files;
        const reader = new FileReader();
        let part_length, part_width, part_name;
        let drill_ops = [];
        reader.onload = function (e) {
            const text = e.target.result;
            // Find part size
            part_length = parseFloat(/l="(\d+\.?\d+)"/g.exec(text)[1]);
            part_width = parseFloat(/w="(\d+\.?\d+)"/g.exec(text)[1]);
            // Find part name
            part_name = /Kommentar\\[\S\s]+KM=[\S\s]+KM=[\S\s]+KM="(.*)"/g.exec(text)[1];
            part_name_elem.innerHTML = part_name;
            // Create array of drilling operations
            const matches = text.matchAll(/Komponente\\([\S\s]+?)KO="/g);
            for (const match of matches) {
                let drill_op = {};
                const op_text = match[1];
                // get edge number
                drill_op.edge = parseInt(/VA="Edge (\d)"/g.exec(op_text)[1]);
                // get hole position
                drill_op.pos = parseFloat(/VA="Pos (\d+\.?\d+)"/g.exec(op_text)[1]);
                // get hole z position
                drill_op.zpos = parseFloat(/VA="ZPos (\d+\.?\d+)"/g.exec(op_text)[1]);
                // get hole diameter
                drill_op.dia = parseFloat(/VA="Diameter (\d+\.?\d+)"/g.exec(op_text)[1]);
                // get drilling depth
                drill_op.drill_depth = parseFloat(/VA="DLength (\d+\.?\d+)"/g.exec(op_text)[1]);
                // get dowel
                drill_op.dowel = parseInt(/VA="dowel (\d+)"/g.exec(op_text)[1]);
                // Add drill_op to drill_ops
                drill_ops.push(drill_op);
            }
            // Draw part
            const part_rec = new paper.Path.Rectangle(part_orig_x, part_orig_y, part_width, part_length);
            part_rec.fillColor = '#a5ccff';
            part_rec.strokeColor = 'black';
            part_rec.strokeWidth = 2;
            // Draw drilling
            // Edges: 1: left, 2: top, 3: right, 4: bottom
            for (const drill_op of drill_ops) {
                let Xorig, Yorig, width, length;
                 if (drill_op.edge === 1) {
                    console.log('edge 1 drill_op');
                    Xorig = part_orig_x;
                    Yorig = part_orig_y + drill_op.pos;
                    width = drill_op.drill_depth;
                    length = drill_op.dia;
                } else if (drill_op.edge === 2) {
                    Xorig = part_orig_x + drill_op.pos;
                    Yorig = part_orig_y;
                    width = drill_op.dia;
                    length = drill_op.drill_depth;
                } else if (drill_op.edge === 3) {
                    Xorig = part_orig_x + part_width - drill_op.drill_depth;
                    Yorig = part_orig_y + drill_op.pos;
                    width = drill_op.drill_depth;
                    length = drill_op.dia;
                } else if (drill_op.edge === 4) {
                    Xorig = part_orig_x + drill_op.pos;
                    Yorig = part_orig_y + part_length - drill_op.drill_depth;
                    width = drill_op.dia;
                    length = drill_op.drill_depth;
                } else {
                    throw Error(`Unexpected drill_op edge (${drill_op.edge})`)
                }
                const drill_rec = new paper.Path.Rectangle(Xorig, Yorig, width, length);
                drill_rec.strokeColor = 'black';
                drill_rec.strokeWidth = 1;
            }
            paper.view.draw();
        }
        for (let i = 0; i < gcodeFileList.length; i++) {
            reader.readAsText(gcodeFileList[i]);
        }
    });
}