const options = {
    mouse: {
        lerpAmt: 0.5,
        repelThreshold: 100
    },
    particles: {
        density: 1.5,  // Controls the density of the particles
        size: 1,    // Size of each particle (bubble)
        get pixelDensity () {
            return (4 - this.density) * 4
        },
        pLerpAmt: 0.25,
        vLerpAmt: 0.1
    },
    text: {
        drawType: drawTypes.STROKE,
        fontColor: [161, 0, 255, 255], // Purple color
        fontSize: 130,
        get fontStyle () {
            return `${this.fontSize}px Oswald, sans-serif`
        },
        message: 'PARTICLE TEXT'
    }
}
const particleProps = [
    'x',
    'y',
    'vx',
    'vy',
    'bx',
    'by'
]
const { buffer, ctx } = createRenderingContext()

let hover = false
let userx = 0
let usery = 0
let repelx = 0
let repely = 0
let centerx = 0
let centery = 0
let particles
let width
let height
let imageBuffer
let gui
let stats

window.addEventListener('resize', setup)
window.addEventListener('mousemove', mousemove)
window.addEventListener('mouseout', mousemove)
window.addEventListener('load', start)

function start () {
    createStats()
    createGUI()
    setup()
    run()    
}

function setup () {
    resize()
    clearBuffer()
    setTextStyles()
    mapParticles()
}

function run () {
    requestAnimationFrame(run)
    
    stats.begin()

    update()
    render()

    stats.end()
}

function update () {
    if (hover) {
        repelx = lerp(repelx, userx, options.mouse.lerpAmt)
        repely = lerp(repely, usery, options.mouse.lerpAmt)
    } else {
        repelx = lerp(repelx, centerx, options.mouse.lerpAmt)
        repely = lerp(repely, centery, options.mouse.lerpAmt)
    }
}

function render () {
    clearBuffer()
    clearScreen()
    drawParticles()
    renderFrame()
}

function mapParticles () {
    drawMessage()

    const pixelData = new Uint32Array(buffer.getImageData(0, 0, width, height).data)
    const pixels = []

    let i, x, y, bx, by, vx, vy

    for (i = 0; i < pixelData.length; i += 4) {
        if (pixelData[i + 3] && !(i % options.particles.pixelDensity)) {
            x = rand(width) | 0
            y = rand(height) | 0
            bx = (i / 4) % width
            by = ((i / 4) / width) | 0
            vx = 0
            vy = 0

            pixels.push(x, y, vx, vy, bx, by)
        }
    }

    particles = new PropsArray(pixels.length / particleProps.length, particleProps)
    particles.set(pixels, 0)
}

function drawParticles () {
    let i, index, x, _x, y, _y, vx, vy, bx, by

    buffer.clearRect(0, 0, width, height)  // Clear the canvas

    particles.forEach(([x, y, vx, vy, bx, by], index) => {
        _x = x | 0
        _y = y | 0

        if (!outOfBounds(_x, _y, width, height)) {
            // Use arc() to draw circles (bubbles)
            ctx.beginPath()
            ctx.arc(_x, _y, options.particles.size, 0, 2 * Math.PI, false) // Draw the circle
            ctx.fillStyle = `rgba(${options.text.fontColor[0]}, ${options.text.fontColor[1]}, ${options.text.fontColor[2]}, ${options.text.fontColor[3] / 255})` // Set color
            ctx.fill() // Fill the circle
        }

        particles.set(updatePixelCoords(x, y, vx, vy, bx, by), index)
    })
}

function fillPixel (imageData, i, [r, g, b, a]) {
    imageData.data.set([r, g, b, a], i)
}

function updatePixelCoords (x, y, vx, vy, bx, by) {
    let rd, dx, dy, phi, f

    rd = dist(x, y, repelx, repely)

    phi = angle(repelx, repely, x, y)
    f = (pow(options.mouse.repelThreshold, 2) / rd) * (rd / options.mouse.repelThreshold)

    dx = bx - x
    dy = by - y

    vx = lerp(vx, dx + (cos(phi) * f), options.particles.vLerpAmt)
    vy = lerp(vy, dy + (sin(phi) * f), options.particles.vLerpAmt)

    x = lerp(x, x + vx, options.particles.pLerpAmt)
    y = lerp(y, y + vy, options.particles.pLerpAmt)

    return [x, y, vx, vy]
}

function outOfBounds (x, y, width, height) {
    return x < 0 || x >= width || y < 0 || y >= height
}

function renderFrame () {
    ctx.save()

    ctx.filter = 'blur(8px) brightness(200%)'
    ctx.drawImage(buffer.canvas, 0, 0)

    ctx.filter = 'blur(0)'
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(buffer.canvas, 0, 0)

    ctx.restore()
}

function clearScreen () {
    clear(ctx)
}

function clearBuffer () {
    clear(buffer)
}

function clear (_ctx) {
    _ctx.clearRect(0, 0, _ctx.canvas.width, _ctx.canvas.height)
}

function drawMessage () {
    drawText(
        options.text.message,
        centerx,
        centery,
        options.text.drawType
    )
}

function setTextStyles () {
    setFont(options.text.fontStyle)
    setTextBaseline(textBaselineTypes.MIDDLE)
    setTextAlign(textAlignTypes.CENTER)
}

function drawText (str = '', x = 0, y = 0, type = drawTypes.FILL) {
    buffer[`${type}Text`](str, x, y)
}

function setFont (font) {
    buffer.font = font
}

function setTextAlign (align = textAlignTypes.LEFT) {
    buffer.textAlign = align
}

function setTextBaseline (baseline = textBaselineTypes.ALPHABETIC) {
    buffer.textBaseline = baseline
}

function resize () {
    buffer.canvas.width = width = innerWidth
    buffer.canvas.height = height = innerHeight

    buffer.drawImage(ctx.canvas, 0, 0)

    ctx.canvas.width = innerWidth
    ctx.canvas.height = innerHeight

    ctx.drawImage(buffer.canvas, 0, 0)

    centerx = 0.5 * innerWidth
    centery = 0.5 * innerHeight

    imageBuffer = buffer.createImageData(width, height)
}

function mousemove ({ type, clientX, clientY }) {
    hover = type === 'mousemove'
    userx = clientX
    usery = clientY
}

function createStats () {
    stats = new Stats()
    document.body.appendChild(stats.domElement)
    stats.domElement.style.position = 'absolute'
}

function createGUI () {
    gui = new dat.GUI()

    addTextOptions()
    addMouseOptions()
    addParticleOptions()
}

function addTextOptions () {
    const textFolder = gui.addFolder('text')

    textFolder.add(options.text, 'drawType', Object.values(drawTypes))
        .onFinishChange(setup)
    textFolder.addColor(options.text, 'fontColor')
    textFolder.add(options.text, 'fontSize', 20, 200)
        .onFinishChange(setup)
    textFolder.add(options.text, 'message')
        .onFinishChange(setup)

    textFolder.open()
}

function addMouseOptions () {
    const mouseFolder = gui.addFolder('mouse')

    mouseFolder.add(options.mouse, 'lerpAmt', 0.05, 1)
    mouseFolder.add(options.mouse, 'repelThreshold', 20, 200)

    mouseFolder.open()
}

function addParticleOptions () {
    const particlesFolder = gui.addFolder('particles')

    particlesFolder.add(options.particles, 'density', 1, 4, 1)
        .onFinishChange(setup)
    particlesFolder.add(options.particles, 'pLerpAmt', 0.05, 1)
        .onFinishChange(setup)
    particlesFolder.add(options.particles, 'vLerpAmt', 0.05, 1)
        .onFinishChange(setup)

    particlesFolder.open()
}
