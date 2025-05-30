const canvas = document.querySelector(".cameraCanvas");
        const ctx = canvas.getContext("2d");
        const video = document.createElement("video");
        video.setAttribute("autoplay", "");
        video.setAttribute("playsinline", "");

        // Canvas dimensions
        const width = canvas.width;
        const height = canvas.height;

        // State variables
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

        // Show loading indicator
        function showLoading(show) {
            document.querySelector('.loading-indicator').style.display = show ? 'block' : 'none';
        }

        // Load BodyPix model
        async function loadBodyPixModel() {
            showLoading(true);
            try {
                net = await bodyPix.load({
                    architecture: 'MobileNetV1',
                    outputStride: 16,
                    multiplier: 0.75,
                    quantBytes: 2
                });
                console.log("BodyPix model loaded successfully");
            } catch (err) {
                console.error("Failed to load BodyPix model:", err);
            } finally {
                showLoading(false);
            }
        }

        // Body detection function
        async function detectBody() {
            if (!net || !isBodyTrackingEnabled) return null;
            try {
                return await net.segmentPersonParts(video, {
                    flipHorizontal: false,
                    internalResolution: 'medium',
                    segmentationThreshold: 0.7
                });
            } catch (err) {
                console.error("Body detection error:", err);
                return null;
            }
        }

        // Adjust clothing position based on body pose
        function adjustClothingPosition(clothing, segmentation) {
            if (!segmentation?.pose) return;
            switch(clothing.type) {
                case 'ao':
                    if (segmentation.pose.leftShoulder && segmentation.pose.rightShoulder) {
                        const left = segmentation.pose.leftShoulder;
                        const right = segmentation.pose.rightShoulder;
                        clothing.x = left.x - 30;
                        clothing.y = left.y - 20;
                        clothing.width = Math.abs(right.x - left.x) + 60;
                        clothing.height = clothing.width / (clothing.image.naturalWidth / clothing.image.naturalHeight);
                    }
                    break;
                case 'quan':
                    if (segmentation.pose.leftHip && segmentation.pose.rightHip) {
                        const left = segmentation.pose.leftHip;
                        const right = segmentation.pose.rightHip;
                        clothing.x = left.x - 40;
                        clothing.y = left.y;
                        clothing.width = Math.abs(right.x - left.x) + 80;
                        clothing.height = clothing.width / (clothing.image.naturalWidth / clothing.image.naturalHeight);
                    }
                    break;
                case 'giay':
                case 'phukien':
                    // Accessories and shoes don't auto-adjust position
                    break;
            }
        }

        // Draw clothing with mask
        async function drawClothingWithMask(clothing, segmentation, ctxToUse = ctx) {
            if (!clothing.image.complete || clothing.image.naturalWidth === 0) {
                console.warn(`Skipping clothing draw due to unloaded image: ${clothing.image.src}`);
                return;
            }

            if (clothing.type === 'giay' || clothing.type === 'phukien') {
                // No body mask for shoes and accessories
                ctxToUse.drawImage(clothing.image, clothing.x, clothing.y, clothing.width, clothing.height);
                return;
            }

            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext('2d');

            let bodyParts = [];
            switch(clothing.type) {
                case 'ao':
                    bodyParts = [0, 1, 2, 3, 4, 5]; // torso and upper arms
                    break;
                case 'quan':
                    bodyParts = [12, 13, 14, 15]; // upper legs
                    break;
            }

            const mask = bodyPix.toMask(segmentation, { foregroundIndices: bodyParts });
            maskCtx.putImageData(mask, 0, 0);
            adjustClothingPosition(clothing, segmentation);

            ctxToUse.save();
            ctxToUse.drawImage(maskCanvas, 0, 0, width, height);
            ctxToUse.globalCompositeOperation = 'source-in';
            ctxToUse.drawImage(clothing.image, clothing.x, clothing.y, clothing.width, clothing.height);
            ctxToUse.restore();
        }

        // Main drawing function
        async function drawVideoToCanvas() {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(video, 0, 0, width, height);

            let segmentation = null;
            if (isBodyTrackingEnabled && virtualClothes.length > 0) {
                segmentation = await detectBody();
            }

            if (segmentation) {
                for (const clothing of virtualClothes) {
                    await drawClothingWithMask(clothing, segmentation);
                }
            }

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

        // Initialize camera
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

        // Frame selection
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

        // Sticker selection
        document.querySelectorAll(".side-stickersContainer img").forEach(img => {
            img.addEventListener("click", () => {
                if (img.classList.contains('active')) {
                    img.classList.remove('active');
                    stickers.length = 0; // Clear stickers
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

        // Clothing selection
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
                    if (!isBodyTrackingEnabled) {
                        isBodyTrackingEnabled = true;
                        loadBodyPixModel();
                    }
                }
            });
        });

        // Mouse interactions
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

        // Zoom functionality
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

        // Capture functionality
        document.querySelector(".bottom-captureBtn").addEventListener("click", () => {
            const time = parseInt(document.getElementById("time").value) || 3;
            const countdownDisplay = document.getElementById("countdownDisplay");
            countdownDisplay.style.display = "block";
            countdownDisplay.textContent = time;

            let countdown = time;
            const countdownInterval = setInterval(() => {
                countdown--;
                countdownDisplay.textContent = countdown;
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    countdownDisplay.style.display = "none";
                    captureImage().catch(err => {
                        console.error("Capture image failed:", err);
                        alert("Failed to capture and download image. Please check console for details and try again.");
                    });
                }
            }, 1000);
        });

        async function captureImage() {
            console.log("Starting image capture...");
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw video feed
            try {
                if (video.readyState >= 2) {
                    tempCtx.drawImage(video, 0, 0, width, height);
                    console.log("Video feed drawn successfully");
                } else {
                    throw new Error("Video stream not ready");
                }
            } catch (err) {
                console.error("Error drawing video to canvas:", err);
                throw err;
            }

            // Draw virtual clothes with body segmentation
            if (isBodyTrackingEnabled && virtualClothes.length > 0) {
                try {
                    console.log("Attempting body segmentation...");
                    const segmentation = await detectBody();
                    if (segmentation) {
                        console.log("Body segmentation successful, drawing clothes...");
                        for (const clothing of virtualClothes) {
                            await drawClothingWithMask(clothing, segmentation, tempCtx);
                        }
                    } else {
                        console.warn("No segmentation data available, skipping clothing");
                    }
                } catch (err) {
                    console.error("Error processing clothing:", err);
                }
            }

            // Draw frame
            if (selectedFrame?.complete && selectedFrame.naturalWidth > 0) {
                tempCtx.drawImage(selectedFrame, 0, 0, width, height);
                console.log("Frame drawn successfully");
            } else if (selectedFrame) {
                console.warn("Frame image not loaded:", selectedFrame.src);
            }

            // Draw stickers
            stickers.forEach(sticker => {
                if (sticker.image.complete && sticker.image.naturalWidth > 0) {
                    tempCtx.drawImage(sticker.image, sticker.x, sticker.y, sticker.width, sticker.height);
                    console.log("Sticker drawn:", sticker.image.src);
                } else {
                    console.warn("Sticker image not loaded:", sticker.image.src);
                }
            });

            // Generate and download image
            try {
                const dataURL = tempCanvas.toDataURL("image/png");
                if (!dataURL.startsWith("data:image/png")) {
                    throw new Error("Invalid canvas data URL");
                }
                console.log("Canvas data URL generated successfully");
                localStorage.setItem("capturedImage", dataURL);

                // Attempt QR code generation, but don't fail if it doesn't work
                try {
                    await generateQRCodeFromCanvas();
                    console.log("QR code generated successfully");
                } catch (err) {
                    console.warn("QR code generation failed, continuing with download:", err);
                }

                // Download the image
                const a = document.createElement('a');
                a.href = dataURL;
                a.download = `photobooth_${new Date().toISOString()}.png`;
                document.body.appendChild(a);
                setTimeout(() => {
                    a.click();
                    document.body.removeChild(a);
                    console.log("Image download triggered");
                }, 100);
            } catch (err) {
                console.error("Error generating or downloading image:", err);
                throw err;
            }
        }

        async function generateQRCodeFromCanvas() {
            const qrCodeContainer = document.getElementById("qrCodeContainer");
            qrCodeContainer.innerHTML = "";
            const qrText = "show-captured-image";

            if (typeof QRCode === 'undefined') {
                throw new Error("QRCode library not loaded");
            }

            new QRCode(qrCodeContainer, {
                text: qrText,
                width: 256,
                height: 256,
                colorDark: "#ff6b6b",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        // Clothing category filtering
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

        // Initialize
        initCamera();