const canvas = document.querySelector(".cameraCanvas");
const ctx = canvas.getContext("2d");
const video = document.createElement("video");
video.setAttribute("autoplay", "");
video.setAttribute("playsinline", "");

const width = canvas.width;
const height = canvas.height;

let selectedFrame = null;
const stickers = [];
const virtualClothes = [];
let selectedStickerIndex = null;
let selectedClothingIndex = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDragging = false;
let isBodyTrackingEnabled = false;
let net = null;
let captureInterval = null;
let photosToTake = 0;
let photosTaken = 0;
let countdownInterval = null;

function showLoading(show) {
    document.querySelector('.loading-indicator').style.display = show ? 'block' : 'none';
}

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            drawVideoToCanvas();
        };
    } catch (err) {
        ctx.fillStyle = "#4C4948";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Camera access denied.", width / 2, height / 2);
        console.error("Camera access error:", err);
    }
}

async function drawVideoToCanvas() {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);

    if (selectedFrame?.complete && selectedFrame.naturalWidth > 0) {
        ctx.drawImage(selectedFrame, 0, 0, width, height);
    }

    stickers.forEach((sticker, idx) => {
        if (sticker.image.complete && sticker.image.naturalWidth > 0) {
            ctx.drawImage(sticker.image, sticker.x, sticker.y, sticker.width, sticker.height);
            if (idx === selectedStickerIndex) {
                ctx.strokeStyle = "red";
                ctx.lineWidth = 2;
                ctx.strokeRect(sticker.x, sticker.y, sticker.width, sticker.height);
            }
        }
    });

    if (selectedClothingIndex !== null && virtualClothes[selectedClothingIndex]) {
        const clothing = virtualClothes[selectedClothingIndex];
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.strokeRect(clothing.x, clothing.y, clothing.width, clothing.height);
    }

    requestAnimationFrame(drawVideoToCanvas);
}

document.querySelectorAll(".side-framesContainer img").forEach(img => {
    img.addEventListener("click", () => {
        if (img.classList.contains('active')) {
            selectedFrame = null;
            img.classList.remove('active');
        } else {
            document.querySelectorAll(".side-framesContainer img").forEach(i => i.classList.remove('active'));
            selectedFrame = new Image();
            selectedFrame.src = img.src;
            img.classList.add('active');
        }
    });
});

document.querySelectorAll(".side-stickersContainer img").forEach(img => {
    img.addEventListener("click", () => {
        if (img.classList.contains('active')) {
            img.classList.remove('active');
            stickers.length = 0;
        } else {
            document.querySelectorAll(".side-stickersContainer img").forEach(i => i.classList.remove('active'));
            const newSticker = {
                image: new Image(),
                x: 50,
                y: 50,
                width: 100,
                height: 100,
            };
            newSticker.image.src = img.src;
            stickers.push(newSticker);
            selectedStickerIndex = stickers.length - 1;
            img.classList.add('active');
        }
    });
});

document.querySelectorAll(".clothing-one img").forEach(img => {
    img.addEventListener("click", () => {
        if (img.classList.contains('active')) {
            img.classList.remove('active');
            virtualClothes.length = 0;
            selectedClothingIndex = null;
            isBodyTrackingEnabled = false;
        } else {
            document.querySelectorAll(".clothing-one img").forEach(i => i.classList.remove('active'));
            const newClothing = {
                image: new Image(),
                x: 0,
                y: 0,
                width: 200,
                height: 200,
                type: img.parentElement.dataset.category
            };
            newClothing.image.src = img.src;
            newClothing.image.onload = () => {
                newClothing.height = newClothing.width / (newClothing.image.naturalWidth / newClothing.image.naturalHeight);
            };
            newClothing.image.onerror = () => {
                console.error(`Failed to load clothing image: ${img.src}`);
            };
            virtualClothes.push(newClothing);
            selectedClothingIndex = virtualClothes.length - 1;
            img.classList.add('active');
        }
    });
});

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    selectedStickerIndex = null;
    for (let i = stickers.length - 1; i >= 0; i--) {
        const s = stickers[i];
        if (mouseX >= s.x && mouseX <= s.x + s.width &&
            mouseY >= s.y && mouseY <= s.y + s.height) {
            selectedStickerIndex = i;
            dragOffsetX = mouseX - s.x;
            dragOffsetY = mouseY - s.y;
            isDragging = true;
            const selected = stickers.splice(i, 1)[0];
            stickers.push(selected);
            selectedStickerIndex = stickers.length - 1;
            return;
        }
    }

    selectedClothingIndex = null;
    for (let i = virtualClothes.length - 1; i >= 0; i--) {
        const c = virtualClothes[i];
        if (mouseX >= c.x && mouseX <= c.x + c.width &&
            mouseY >= c.y && mouseY <= c.y + c.height) {
            selectedClothingIndex = i;
            dragOffsetX = mouseX - c.x;
            dragOffsetY = mouseY - c.y;
            isDragging = true;
            const selected = virtualClothes.splice(i, 1)[0];
            virtualClothes.push(selected);
            selectedClothingIndex = virtualClothes.length - 1;
            return;
        }
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (selectedStickerIndex !== null) {
        const sticker = stickers[selectedStickerIndex];
        sticker.x = mouseX - dragOffsetX;
        sticker.y = mouseY - dragOffsetY;
    } else if (selectedClothingIndex !== null) {
        const clothing = virtualClothes[selectedClothingIndex];
        clothing.x = mouseX - dragOffsetX;
        clothing.y = mouseY - dragOffsetY;
    }
});

canvas.addEventListener("mouseup", () => {
    isDragging = false;
    selectedStickerIndex = null;
    selectedClothingIndex = null;
});

canvas.addEventListener("mouseleave", () => {
    isDragging = false;
    selectedStickerIndex = null;
    selectedClothingIndex = null;
});

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (selectedStickerIndex !== null) {
        handleZoom(e, stickers[selectedStickerIndex]);
    } else if (selectedClothingIndex !== null) {
        handleZoom(e, virtualClothes[selectedClothingIndex]);
    }
});

function handleZoom(e, item) {
    const scaleAmount = e.deltaY < 0 ? 1.1 : 0.9;
    const oldWidth = item.width;
    const oldHeight = item.height;
    item.width *= scaleAmount;
    item.height *= scaleAmount;
    item.x += (oldWidth - item.width) / 2;
    item.y += (oldHeight - item.height) / 2;
    item.width = Math.max(20, Math.min(item.width, width * 2));
    item.height = Math.max(20, Math.min(item.height, height * 2));
}

function startPhotoboothSequence() {
    const photoCount = parseInt(document.getElementById("photos").value) || 4;
    const delayTime = parseInt(document.getElementById("time").value) || 3;
    
    photosToTake = photoCount;
    photosTaken = 0;
    
    const captureBtn = document.querySelector(".bottom-captureBtn");
    captureBtn.disabled = true;
    captureBtn.textContent = "Chuẩn bị...";
    
    startNextCapture(delayTime);
}

function startNextCapture(delayTime) {
    const countdownDisplay = document.getElementById("countdownDisplay");
    const countdownNumber = countdownDisplay.querySelector(".countdown-number");
    countdownDisplay.style.display = "block";
    
    let countdown = delayTime;
    countdownNumber.textContent = countdown;
    
    countdownInterval = setInterval(() => {
        countdown--;
        countdownNumber.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            countdownDisplay.style.display = "none";
            
            captureImage().then(() => {
                photosTaken++;
                
                if (photosTaken < photosToTake) {
                    setTimeout(() => {
                        startNextCapture(delayTime);
                    }, 1000);
                } else {
                    const captureBtn = document.querySelector(".bottom-captureBtn");
                    captureBtn.disabled = false;
                    captureBtn.innerHTML = '<span><i class="fa-solid fa-camera"></i></span> Bắt đầu chụp';
                }
            }).catch(err => {
                console.error("Capture failed:", err);
                const captureBtn = document.querySelector(".bottom-captureBtn");
                captureBtn.disabled = false;
                captureBtn.innerHTML = '<span><i class="fa-solid fa-camera"></i></span> Bắt đầu chụp';
            });
        }
    }, 1000);
}

async function captureImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    if (video.readyState >= 2) {
        tempCtx.drawImage(video, 0, 0, width, height);
    }

    if (selectedFrame?.complete && selectedFrame.naturalWidth > 0) {
        tempCtx.drawImage(selectedFrame, 0, 0, width, height);
    }

    stickers.forEach(sticker => {
        if (sticker.image.complete && sticker.image.naturalWidth > 0) {
            tempCtx.drawImage(sticker.image, sticker.x, sticker.y, sticker.width, sticker.height);
        }
    });

    const dataURL = tempCanvas.toDataURL("image/png");
    localStorage.setItem("capturedImage", dataURL);

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `photobooth_${new Date().toISOString()}_${photosTaken + 1}.png`;
    document.body.appendChild(a);
    setTimeout(() => {
        a.click();
        document.body.removeChild(a);
    }, 100);
}

document.querySelectorAll('.clothing-category').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.clothing-category').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const category = button.dataset.category;
        document.querySelectorAll('.clothing-one').forEach(item => {
            item.style.display = (category === 'all' || item.dataset.category === category) ? 'block' : 'none';
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector(".bottom-captureBtn").addEventListener("click", startPhotoboothSequence);
    initCamera();
});