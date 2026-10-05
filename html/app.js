let inventoryAudioContext = null;
let inventoryAudioWarningShown = false;

const InventoryContainer = Vue.createApp({
    data() {
        return this.getInitialState();
    },
    computed: {
        playerWeight() {
            const weight = Object.values(this.playerInventory).reduce((total, item) => {
                if (item && item.weight !== undefined && item.amount !== undefined) {
                    return total + item.weight * item.amount;
                }
                return total;
            }, 0);
            return isNaN(weight) ? 0 : weight;
        },
        otherInventoryWeight() {
            const weight = Object.values(this.otherInventory).reduce((total, item) => {
                if (item && item.weight !== undefined && item.amount !== undefined) {
                    return total + item.weight * item.amount;
                }
                return total;
            }, 0);
            return isNaN(weight) ? 0 : weight;
        },
        weightBarClass() {
            const weightPercentage = (this.playerWeight / this.maxWeight) * 100;
            if (weightPercentage < 50) {
                return "low";
            } else if (weightPercentage < 75) {
                return "medium";
            } else {
                return "high";
            }
        },
        otherWeightBarClass() {
            const weightPercentage = (this.otherInventoryWeight / this.otherInventoryMaxWeight) * 100;
            if (weightPercentage < 50) {
                return "low";
            } else if (weightPercentage < 75) {
                return "medium";
            } else {
                return "high";
            }
        },
        menuQty() {
            const max = this.contextMenuItem ? this.contextMenuItem.amount : 1;
            return Math.min(Math.max(parseInt(this.menuAmount) || 1, 1), max);
        },
        playerPct() {
            return Math.min((this.playerWeight / this.maxWeight) * 100, 100) || 0;
        },
        otherPct() {
            return Math.min((this.otherInventoryWeight / this.otherInventoryMaxWeight) * 100, 100) || 0;
        },
        hotCount() {
            return [1, 2, 3, 4, 5].filter((s) => this.playerInventory[s]).length;
        },
        emptyAttachmentSlots() {
            const n = this.selectedWeaponAttachments.length;
            return Math.max(4, Math.ceil(n / 4) * 4) - n;
        },
        primarySlots() {
            return Array.from({ length: Math.max(this.totalSlots - 5, 0) }, (_, i) => i + 6);
        },
        shouldCenterInventory() {
            return this.isOtherInventoryEmpty;
        },
    },
    watch: {
        transferAmount(newVal) {
            if (newVal !== null && newVal < 1) this.transferAmount = 1;
        },
    },
    methods: {
        getInitialState() {
            return {
                // Config Options
                maxWeight: 0,
                totalSlots: 0,
                // Escape Key
                isInventoryOpen: false,
                isStandalonePreview: false,
                previewOtherInventory: [],
                // Single pane
                isOtherInventoryEmpty: true,
                // Error handling
                errorSlot: null,
                // Player Inventory
                playerInventory: {},
                inventoryLabel: "Inventory",
                totalWeight: 0,
                // Other inventory
                otherInventory: {},
                otherInventoryName: "",
                otherInventoryLabel: "Drop",
                otherInventoryMaxWeight: 1000000,
                otherInventorySlots: 100,
                isShopInventory: false,
                // Where item is coming from
                inventory: "",
                // Context Menu
                showContextMenu: false,
                contextMenuPosition: { top: "0px", left: "0px" },
                contextMenuItem: null,
                showSubmenu: false,
                menuAmount: 1,
                // Hotbar
                showHotbar: false,
                hotbarItems: [],
                // Notification box
                showNotification: false,
                notificationText: "",
                notificationImage: "",
                notificationType: "added",
                notificationAmount: 1,
                // Required items box
                showRequiredItems: false,
                requiredItems: [],
                // Attachments
                selectedWeapon: null,
                showWeaponAttachments: false,
                selectedWeaponAttachments: [],
                attachmentsLoading: false,
                attachmentBusy: false,
                // Dragging and dropping
                currentlyDraggingItem: null,
                currentlyDraggingSlot: null,
                dragStartX: 0,
                dragStartY: 0,
                ghostElement: null,
                dragStartInventoryType: "player",
                transferAmount: null,
            };
        },
        openInventory(data) {
            if (this.showHotbar) {
                this.toggleHotbar(false);
            }

            if (!this.isStandalonePreview) {
                this.playInventorySound("open");
            }
            this.isInventoryOpen = true;
            this.maxWeight = data.maxweight;
            this.totalSlots = data.slots;
            this.playerInventory = {};
            this.otherInventory = {};

            if (data.inventory) {
                if (Array.isArray(data.inventory)) {
                    data.inventory.forEach((item) => {
                        if (item && item.slot) {
                            this.playerInventory[item.slot] = item;
                        }
                    });
                } else if (typeof data.inventory === "object") {
                    for (const key in data.inventory) {
                        const item = data.inventory[key];
                        if (item && item.slot) {
                            this.playerInventory[item.slot] = item;
                        }
                    }
                }
            }

            if (data.other) {
                if (data.other && data.other.inventory) {
                    if (Array.isArray(data.other.inventory)) {
                        data.other.inventory.forEach((item) => {
                            if (item && item.slot) {
                                this.otherInventory[item.slot] = item;
                            }
                        });
                    } else if (typeof data.other.inventory === "object") {
                        for (const key in data.other.inventory) {
                            const item = data.other.inventory[key];
                            if (item && item.slot) {
                                this.otherInventory[item.slot] = item;
                            }
                        }
                    }
                }

                this.otherInventoryName = data.other.name;
                this.otherInventoryLabel = data.other.label;
                this.otherInventoryMaxWeight = data.other.maxweight;
                this.otherInventorySlots = data.other.slots;

                if (this.otherInventoryName.startsWith("shop-")) {
                    this.isShopInventory = true;
                } else {
                    this.isShopInventory = false;
                }

                this.isOtherInventoryEmpty = false;
            }
        },
        updateInventory(data) {
            this.playerInventory = {};

            if (data.inventory) {
                if (Array.isArray(data.inventory)) {
                    data.inventory.forEach((item) => {
                        if (item && item.slot) {
                            this.playerInventory[item.slot] = item;
                        }
                    });
                } else if (typeof data.inventory === "object") {
                    for (const key in data.inventory) {
                        const item = data.inventory[key];
                        if (item && item.slot) {
                            this.playerInventory[item.slot] = item;
                        }
                    }
                }
            }

            if (data.otherItems) {
                this.otherInventory = {};
                if (Array.isArray(data.otherItems)) {
                    data.otherItems.forEach((item) => {
                        if (item && item.slot) {
                            this.otherInventory[item.slot] = item;
                        }
                    });
                } else if (typeof data.otherItems === "object") {
                    for (const key in data.otherItems) {
                        const item = data.otherItems[key];
                        if (item && item.slot) {
                            this.otherInventory[item.slot] = item;
                        }
                    }
                }
            }

            if (data.errorSlot)
                this.inventoryError(data.errorSlot, data.errorInventory); // pass from inventory for from errors
        },
        async closeInventory() {
            if (this.isInventoryOpen) {
                this.playInventorySound("close");
            }
            this.clearDragData();
            let inventoryName = this.otherInventoryName;
            Object.assign(this, this.getInitialState());
            try {
                await axios.post("https://qb-inventory/CloseInventory", { name: inventoryName });
            } catch (error) {
                console.error("Error closing inventory:", error);
            }
        },
        clearTransferAmount() {
            this.playInventorySound("click");
            this.transferAmount = null;
        },
        playInventorySound(sound) {
            const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextConstructor) {
                if (!inventoryAudioWarningShown) {
                    console.warn("Inventory sounds are unavailable because Web Audio is not supported.");
                    inventoryAudioWarningShown = true;
                }
                return;
            }

            const sounds = {
                open: [
                    { frequency: 523.25, offset: 0, duration: 0.12 },
                    { frequency: 659.25, offset: 0.055, duration: 0.14 },
                    { frequency: 783.99, offset: 0.11, duration: 0.17 },
                ],
                close: [
                    { frequency: 783.99, offset: 0, duration: 0.11 },
                    { frequency: 659.25, offset: 0.055, duration: 0.12 },
                    { frequency: 523.25, offset: 0.11, duration: 0.15 },
                ],
                click: [{ frequency: 720, offset: 0, duration: 0.045 }],
                move: [
                    { frequency: 440, offset: 0, duration: 0.09 },
                    { frequency: 587.33, offset: 0.045, duration: 0.11 },
                ],
                drop: [
                    { frequency: 392, offset: 0, duration: 0.1 },
                    { frequency: 523.25, offset: 0.055, duration: 0.12 },
                ],
                purchase: [
                    { frequency: 587.33, offset: 0, duration: 0.1 },
                    { frequency: 739.99, offset: 0.06, duration: 0.11 },
                    { frequency: 880, offset: 0.12, duration: 0.15 },
                ],
                use: [
                    { frequency: 659.25, offset: 0, duration: 0.09 },
                    { frequency: 783.99, offset: 0.05, duration: 0.1 },
                    { frequency: 987.77, offset: 0.1, duration: 0.14 },
                ],
            };
            const notes = sounds[sound];
            if (!notes) return;

            try {
                if (!inventoryAudioContext) {
                    inventoryAudioContext = new AudioContextConstructor();
                }
                if (inventoryAudioContext.state === "suspended") {
                    inventoryAudioContext.resume().catch((error) => {
                        if (!inventoryAudioWarningShown) {
                            console.warn("Unable to resume inventory sounds:", error);
                            inventoryAudioWarningShown = true;
                        }
                    });
                }

                const now = inventoryAudioContext.currentTime;
                notes.forEach(({ frequency, offset, duration }) => {
                    const oscillator = inventoryAudioContext.createOscillator();
                    const gain = inventoryAudioContext.createGain();
                    const start = now + offset;
                    oscillator.type = "sine";
                    oscillator.frequency.setValueAtTime(frequency, start);
                    gain.gain.setValueAtTime(0.0001, start);
                    gain.gain.exponentialRampToValueAtTime(0.04, start + 0.012);
                    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                    oscillator.connect(gain);
                    gain.connect(inventoryAudioContext.destination);
                    oscillator.start(start);
                    oscillator.stop(start + duration);
                });
            } catch (error) {
                if (!inventoryAudioWarningShown) {
                    console.warn("Unable to play inventory sounds:", error);
                    inventoryAudioWarningShown = true;
                }
            }
        },
        getItemInSlot(slot, inventoryType) {
            if (inventoryType === "player") {
                return this.playerInventory[slot] || null;
            } else if (inventoryType === "other") {
                return this.otherInventory[slot] || null;
            }
            return null;
        },
        getHotbarItemInSlot(slot) {
            return this.hotbarItems[slot - 1] || null;
        },
        togglePreviewOtherInventory() {
            if (!this.isStandalonePreview) return;

            this.playInventorySound("click");
            if (this.isOtherInventoryEmpty) {
                this.otherInventory = Object.fromEntries(this.previewOtherInventory.map((item) => [item.slot, item]));
                this.otherInventoryName = "preview-stash";
                this.otherInventoryLabel = "Storage";
                this.otherInventoryMaxWeight = 50000;
                this.otherInventorySlots = 20;
                this.isShopInventory = false;
                this.isOtherInventoryEmpty = false;
            } else {
                this.otherInventory = {};
                this.isOtherInventoryEmpty = true;
            }
        },
        containerMouseDownAction(event) {
            if (event.button === 0 && this.showContextMenu) {
                this.showContextMenu = false;
            }
        },
        handleMouseDown(event, slot, inventory) {
            if (event.button === 1) return; // skip middle mouse
            event.preventDefault();
            const itemInSlot = this.getItemInSlot(slot, inventory);
            if (event.button === 0) {
                if (event.shiftKey && itemInSlot) {
                    this.splitAndPlaceItem(itemInSlot, inventory);
                } else {
                    this.startDrag(event, slot, inventory);
                }
            } else if (event.button === 2 && itemInSlot) {
                if (this.otherInventoryName.startsWith("shop-")) {
                    this.handlePurchase(slot, itemInSlot.slot, itemInSlot, 1);
                    return;
                }
                if (!this.isOtherInventoryEmpty) {
                    this.moveItemBetweenInventories(itemInSlot, inventory);
                } else {
                    this.showContextMenuOptions(event, itemInSlot);
                }
            }
        },
        moveItemBetweenInventories(item, sourceInventoryType) {
            const sourceInventory = sourceInventoryType === "player" ? this.playerInventory : this.otherInventory;
            const targetInventory = sourceInventoryType === "player" ? this.otherInventory : this.playerInventory;
            const targetWeight = sourceInventoryType === "player" ? this.otherInventoryWeight : this.playerWeight;
            const maxTargetWeight = sourceInventoryType === "player" ? this.otherInventoryMaxWeight : this.maxWeight;
            const amountToTransfer = this.transferAmount !== null ? this.transferAmount : 1;
            let targetSlot = null;

            const sourceItem = sourceInventory[item.slot];
            if (!sourceItem || sourceItem.amount < amountToTransfer) {
                this.inventoryError(item.slot);
                return;
            }

            const totalWeightAfterTransfer = targetWeight + sourceItem.weight * amountToTransfer;

            if (totalWeightAfterTransfer > maxTargetWeight) {
                this.inventoryError(item.slot);
                return;
            }

            if (item.unique) {
                targetSlot = this.findNextAvailableSlot(targetInventory);
                if (targetSlot === null) {
                    this.inventoryError(item.slot);
                    return;
                }

                const newItem = {
                    ...item,
                    inventory: sourceInventoryType === "player" ? "other" : "player",
                    amount: amountToTransfer,
                };
                targetInventory[targetSlot] = newItem;
                newItem.slot = targetSlot;
            } else {
                const targetItemKey = Object.keys(targetInventory).find((key) => targetInventory[key] && targetInventory[key].name === item.name);
                const targetItem = targetInventory[targetItemKey];

                if (!targetItem) {
                    const newItem = {
                        ...item,
                        inventory: sourceInventoryType === "player" ? "other" : "player",
                        amount: amountToTransfer,
                    };

                    targetSlot = this.findNextAvailableSlot(targetInventory);
                    if (targetSlot === null) {
                        this.inventoryError(item.slot);
                        return;
                    }

                    targetInventory[targetSlot] = newItem;
                    newItem.slot = targetSlot;
                } else {
                    targetItem.amount += amountToTransfer;
                    targetSlot = targetItem.slot;
                }
            }

            sourceItem.amount -= amountToTransfer;

            if (sourceItem.amount <= 0) {
                delete sourceInventory[item.slot];
            }

            this.postInventoryData(sourceInventoryType, sourceInventoryType === "player" ? "other" : "player", item.slot, targetSlot, sourceItem.amount, amountToTransfer);
        },
        startDrag(event, slot, inventoryType) {
            event.preventDefault();
            const item = this.getItemInSlot(slot, inventoryType);
            if (!item) return;
            const slotElement = event.target.closest(".item-slot");
            if (!slotElement) return;
            this.playInventorySound("click");
            const ghostElement = this.createGhostElement(slotElement);
            document.body.appendChild(ghostElement);
            const offsetX = ghostElement.offsetWidth / 2;
            const offsetY = ghostElement.offsetHeight / 2;
            ghostElement.style.left = `${event.clientX - offsetX}px`;
            ghostElement.style.top = `${event.clientY - offsetY}px`;
            this.ghostElement = ghostElement;
            this.currentlyDraggingItem = item;
            this.currentlyDraggingSlot = slot;
            this.dragStartX = event.clientX;
            this.dragStartY = event.clientY;
            this.dragStartInventoryType = inventoryType;
            this.showContextMenu = false;
        },
        createGhostElement(slotElement) {
            const ghostElement = slotElement.cloneNode(true);
            ghostElement.style.position = "absolute";
            ghostElement.style.pointerEvents = "none";
            ghostElement.style.opacity = "0.7";
            ghostElement.style.zIndex = "1000";
            ghostElement.style.width = getComputedStyle(slotElement).width;
            ghostElement.style.height = getComputedStyle(slotElement).height;
            ghostElement.style.boxSizing = "border-box";
            return ghostElement;
        },
        drag(event) {
            if (!this.currentlyDraggingItem) return;
            const centeredX = event.clientX - this.ghostElement.offsetWidth / 2;
            const centeredY = event.clientY - this.ghostElement.offsetHeight / 2;
            this.ghostElement.style.left = `${centeredX}px`;
            this.ghostElement.style.top = `${centeredY}px`;
        },
        dbl(slot) {
            const item = this.playerInventory[slot];
            if (item) this.useItem(item);
        },
        endDrag(event) {
            if (!this.currentlyDraggingItem) {
                return;
            }

            const elementsUnderCursor = document.elementsFromPoint(event.clientX, event.clientY);


            const playerSlotElement = elementsUnderCursor.find((el) => el.classList.contains("item-slot") && el.closest(".player-inventory-section"));

            const otherSlotElement = elementsUnderCursor.find((el) => el.classList.contains("item-slot") && el.closest(".other-inventory-section"));

            if (playerSlotElement) {
                const targetSlot = Number(playerSlotElement.dataset.slot);
                if (targetSlot && !(targetSlot === this.currentlyDraggingSlot && this.dragStartInventoryType === "player")) {
                    this.handleDropOnPlayerSlot(targetSlot);
                }
            } else if (otherSlotElement) {
                const targetSlot = Number(otherSlotElement.dataset.slot);
                if (targetSlot && !(targetSlot === this.currentlyDraggingSlot && this.dragStartInventoryType === "other")) {
                    this.handleDropOnOtherSlot(targetSlot);
                }
            } else if (this.isOtherInventoryEmpty && this.dragStartInventoryType === "player") {
                const isOverInventoryGrid = elementsUnderCursor.some((el) => el.classList.contains("inventory-grid") || el.classList.contains("item-grid"));

                if (!isOverInventoryGrid) {
                    this.handleDropOnInventoryContainer();
                }
            }

            this.clearDragData();
        },
        handleDropOnPlayerSlot(targetSlot) {
            if (this.isShopInventory && this.dragStartInventoryType === "other") {
                const { currentlyDraggingSlot, currentlyDraggingItem, transferAmount } = this;
                const targetInventory = this.getInventoryByType("player");
                const targetItem = targetInventory[targetSlot];
                if ((targetItem && targetItem.name !== currentlyDraggingItem.name) || (targetItem && targetItem.name === currentlyDraggingItem.name && currentlyDraggingItem.unique)) {
                    this.inventoryError(currentlyDraggingSlot);
                    return;
                }
                this.handlePurchase(targetSlot, currentlyDraggingSlot, currentlyDraggingItem, transferAmount);
            } else {
                this.handleItemDrop("player", targetSlot);
            }
        },
        handleDropOnOtherSlot(targetSlot) {
            this.handleItemDrop("other", targetSlot);
        },
        async handleDropOnInventoryContainer() {
            if (this.isOtherInventoryEmpty && this.dragStartInventoryType === "player") {
                const newItem = {
                    ...this.currentlyDraggingItem,
                    amount: this.currentlyDraggingItem.amount,
                    slot: 1,
                    inventory: "other",
                };
                const draggingItem = this.currentlyDraggingItem;
                try {
                    const response = await axios.post("https://qb-inventory/DropItem", {
                        ...newItem,
                        fromSlot: this.currentlyDraggingSlot,
                    });

                    if (response.data) {
                        this.otherInventory[1] = newItem;
                        const draggingItemKey = Object.keys(this.playerInventory).find((key) => this.playerInventory[key] === draggingItem);
                        if (draggingItemKey) {
                            delete this.playerInventory[draggingItemKey];
                        }
                        this.otherInventoryName = response.data;
                        this.otherInventoryLabel = response.data;
                        this.isOtherInventoryEmpty = false;
                        this.playInventorySound("drop");
                        this.clearDragData();
                    }
                } catch (error) {
                    this.inventoryError(this.currentlyDraggingSlot);
                }
            }
            this.clearDragData();
        },
        clearDragData() {
            if (this.ghostElement) {
                document.body.removeChild(this.ghostElement);
                this.ghostElement = null;
            }
            this.currentlyDraggingItem = null;
            this.currentlyDraggingSlot = null;
        },
        getInventoryByType(inventoryType) {
            return inventoryType === "player" ? this.playerInventory : this.otherInventory;
        },
        handleItemDrop(targetInventoryType, targetSlot) {
            try {
                const isShop = this.otherInventoryName.indexOf("shop-");
                if (this.dragStartInventoryType === "other" && targetInventoryType === "other" && isShop !== -1) {
                    return;
                }

                const targetSlotNumber = parseInt(targetSlot, 10);
                if (isNaN(targetSlotNumber)) {
                    throw new Error("Invalid target slot number");
                }

                const sourceInventory = this.getInventoryByType(this.dragStartInventoryType);
                const targetInventory = this.getInventoryByType(targetInventoryType);

                const sourceItem = sourceInventory[this.currentlyDraggingSlot];
                if (!sourceItem) {
                    throw new Error("No item in the source slot to transfer");
                }

                const amountToTransfer = this.transferAmount !== null ? this.transferAmount : sourceItem.amount;
                if (sourceItem.amount < amountToTransfer) {
                    throw new Error("Insufficient amount of item in source inventory");
                }

                if (targetInventoryType !== this.dragStartInventoryType) {
                    if (targetInventoryType == "other") {
                        const totalWeightAfterTransfer = this.otherInventoryWeight + sourceItem.weight * amountToTransfer;
                        if (totalWeightAfterTransfer > this.otherInventoryMaxWeight) {
                            throw new Error("Insufficient weight capacity in target inventory");
                        }
                    } else if (targetInventoryType == "player") {
                        const totalWeightAfterTransfer = this.playerWeight + sourceItem.weight * amountToTransfer;
                        if (totalWeightAfterTransfer > this.maxWeight) {
                            throw new Error("Insufficient weight capacity in player inventory");
                        }
                    }
                }

                const targetItem = targetInventory[targetSlotNumber];

                if (targetItem) {
                    if (sourceItem.name === targetItem.name && targetItem.unique) {
                        this.inventoryError(this.currentlyDraggingSlot);
                        return;
                    }
                    if (sourceItem.name === targetItem.name && !targetItem.unique) {
                        targetItem.amount += amountToTransfer;
                        sourceItem.amount -= amountToTransfer;
                        if (sourceItem.amount <= 0) {
                            delete sourceInventory[this.currentlyDraggingSlot];
                        }
                        this.postInventoryData(this.dragStartInventoryType, targetInventoryType, this.currentlyDraggingSlot, targetSlotNumber, sourceItem.amount, amountToTransfer);
                    } else {
                        sourceInventory[this.currentlyDraggingSlot] = targetItem;
                        targetInventory[targetSlotNumber] = sourceItem;
                        sourceInventory[this.currentlyDraggingSlot].slot = this.currentlyDraggingSlot;
                        targetInventory[targetSlotNumber].slot = targetSlotNumber;
                        this.postInventoryData(this.dragStartInventoryType, targetInventoryType, this.currentlyDraggingSlot, targetSlotNumber, sourceItem.amount, targetItem.amount);
                    }
                } else {
                    sourceItem.amount -= amountToTransfer;
                    if (sourceItem.amount <= 0) {
                        delete sourceInventory[this.currentlyDraggingSlot];
                    }
                    targetInventory[targetSlotNumber] = { ...sourceItem, amount: amountToTransfer, slot: targetSlotNumber };
                    this.postInventoryData(this.dragStartInventoryType, targetInventoryType, this.currentlyDraggingSlot, targetSlotNumber, sourceItem.amount, amountToTransfer);
                }
            } catch (error) {
                console.error(error.message);
                this.inventoryError(this.currentlyDraggingSlot);
            } finally {
                this.clearDragData();
            }
        },
        async handlePurchase(targetSlot, sourceSlot, sourceItem, transferAmount) {
            try {
                const response = await axios.post("https://qb-inventory/AttemptPurchase", {
                    item: sourceItem,
                    amount: transferAmount || sourceItem.amount,
                    shop: this.otherInventoryName,
                });
                if (response.data) {
                    const sourceInventory = this.getInventoryByType("other");
                    const targetInventory = this.getInventoryByType("player");
                    const amountToTransfer = transferAmount !== null ? transferAmount : sourceItem.amount;
                    if (sourceItem.amount < amountToTransfer) {
                        this.inventoryError(sourceSlot, "other");
                        return;
                    }
                    let targetItem = targetInventory[targetSlot];
                    if (!targetItem || targetItem.name !== sourceItem.name) {
                        let foundSlot = Object.keys(targetInventory).find((slot) => targetInventory[slot] && targetInventory[slot].name === sourceItem.name);
                        if (foundSlot) {
                            targetInventory[foundSlot].amount += amountToTransfer;
                        } else {
                            const targetInventoryKeys = Object.keys(targetInventory);
                            if (targetInventoryKeys.length < this.totalSlots) {
                                let freeSlot = Array.from({ length: this.totalSlots }, (_, i) => i + 1).find((i) => !(i in targetInventory));
                                targetInventory[freeSlot] = {
                                    ...sourceItem,
                                    amount: amountToTransfer,
                                };
                            } else {
                                this.inventoryError(sourceSlot, "other");
                                return;
                            }
                        }
                    } else {
                        targetItem.amount += amountToTransfer;
                    }
                    sourceItem.amount -= amountToTransfer;
                    if (sourceItem.amount <= 0) {
                        delete sourceInventory[sourceSlot];
                    }
                    this.playInventorySound("purchase");
                } else {
                    this.inventoryError(sourceSlot, "other");
                }
            } catch (error) {
                this.inventoryError(sourceSlot, "other");
            }
        },
        async dropItem(item, quantity) {
            if (item && item.name) {
                const playerItemKey = Object.keys(this.playerInventory).find((key) => this.playerInventory[key] && this.playerInventory[key].slot === item.slot);
                if (playerItemKey) {
                    let amountToGive;

                    if (typeof quantity === "string") {
                        switch (quantity) {
                            case "half":
                                amountToGive = Math.ceil(item.amount / 2);
                                break;
                            case "all":
                                amountToGive = item.amount;
                                break;
                            default:
                                console.error("Invalid quantity specified.");
                                return;
                        }
                    } else if (typeof quantity === "number" && quantity > 0) {
                        amountToGive = quantity;
                    } else {
                        console.error("Invalid quantity type specified.");
                        return;
                    }

                    if (amountToGive > item.amount) {
                        amountToGive = item.amount;
                    }

                    const newItem = {
                        ...item,
                        amount: amountToGive,
                        slot: 1,
                        inventory: "other",
                    };

                    try {
                        const response = await axios.post("https://qb-inventory/DropItem", {
                            ...newItem,
                            fromSlot: item.slot,
                        });

                        if (response.data) {
                            delete this.playerInventory[playerItemKey];
                            this.otherInventory[1] = newItem;
                            this.otherInventoryName = response.data;
                            this.otherInventoryLabel = response.data;
                            this.isOtherInventoryEmpty = false;
                            this.playInventorySound("drop");
                        }
                    } catch (error) {
                        this.inventoryError(item.slot);
                    }
                }
            }
            this.showContextMenu = false;
        },
        async useItem(item) {
            if (!item || item.useable === false) {
                return;
            }
            const playerItemKey = Object.keys(this.playerInventory).find((key) => this.playerInventory[key] && this.playerInventory[key].slot === item.slot);
            if (playerItemKey) {
                try {
                    await axios.post("https://qb-inventory/UseItem", {
                        inventory: "player",
                        item: item,
                    });
                    this.playInventorySound("use");
                    if (item.shouldClose) {
                        this.closeInventory();
                    }
                } catch (error) {
                    console.error("Error using the item: ", error);
                }
            }
            this.showContextMenu = false;
        },
        showContextMenuOptions(event, item) {
            event.preventDefault();
            if (this.contextMenuItem && this.contextMenuItem.name === item.name && this.showContextMenu) {
                this.showContextMenu = false;
                this.contextMenuItem = null;
            } else {
                if (item.inventory === "other") {
                    const matchingItemKey = Object.keys(this.playerInventory).find((key) => this.playerInventory[key].name === item.name);
                    const matchingItem = this.playerInventory[matchingItemKey];

                    if (matchingItem && matchingItem.unique) {
                        const newItemKey = Object.keys(this.playerInventory).length + 1;
                        const newItem = {
                            ...item,
                            inventory: "player",
                            amount: 1,
                        };
                        this.playerInventory[newItemKey] = newItem;
                    } else if (matchingItem) {
                        matchingItem.amount++;
                    } else {
                        const newItemKey = Object.keys(this.playerInventory).length + 1;
                        const newItem = {
                            ...item,
                            inventory: "player",
                            amount: 1,
                        };
                        this.playerInventory[newItemKey] = newItem;
                    }
                    item.amount--;
                    this.playInventorySound("move");

                    if (item.amount <= 0) {
                        const itemKey = Object.keys(this.otherInventory).find((key) => this.otherInventory[key] === item);
                        if (itemKey) {
                            delete this.otherInventory[itemKey];
                        }
                    }
                }
                if (item.inventory !== "other") {
                    this.playInventorySound("click");
                }
                const menuLeft = Math.min(event.clientX, window.innerWidth - window.innerHeight * 0.5);
                const menuTop = Math.min(event.clientY, window.innerHeight - window.innerHeight * 0.5);
                this.menuAmount = 1;
                this.showContextMenu = true;
                this.contextMenuPosition = {
                    top: `${menuTop}px`,
                    left: `${menuLeft}px`,
                };
                this.contextMenuItem = item;
            }
        },
        async giveItem(item, quantity) {
            if (item && item.name) {
                const selectedItem = item;
                const playerHasItem = Object.values(this.playerInventory).some((invItem) => invItem && invItem.name === selectedItem.name);

                if (playerHasItem) {
                    let amountToGive;
                    if (typeof quantity === "string") {
                        switch (quantity) {
                            case "half":
                                amountToGive = Math.ceil(selectedItem.amount / 2);
                                break;
                            case "all":
                                amountToGive = selectedItem.amount;
                                break;
                            default:
                                console.error("Invalid quantity specified.");
                                return;
                        }
                    } else {
                        amountToGive = quantity;
                    }

                    if (amountToGive > selectedItem.amount) {
                        console.error("Specified quantity exceeds available amount.");
                        return;
                    }

                    try {
                        const response = await axios.post("https://qb-inventory/GiveItem", {
                            item: selectedItem,
                            amount: amountToGive,
                            slot: selectedItem.slot,
                            info: selectedItem.info,
                        });
                        if (!response.data) return;

                        this.playerInventory[selectedItem.slot].amount -= amountToGive;
                        if (this.playerInventory[selectedItem.slot].amount === 0) {
                            delete this.playerInventory[selectedItem.slot];
                        }
                    } catch (error) {
                        console.error("An error occurred while giving the item:", error);
                    }
                } else {
                    console.error("Player does not have the item in their inventory. Item cannot be given.");
                }
            }
            this.showContextMenu = false;
        },
        findNextAvailableSlot(inventory) {
            for (let slot = 1; slot <= this.totalSlots; slot++) {
                if (!inventory[slot]) {
                    return slot;
                }
            }
            return null;
        },
        splitAndPlaceItem(item, inventoryType) {
            const inventoryRef = inventoryType === "player" ? this.playerInventory : this.otherInventory;
            if (item && item.amount > 1) {
                const originalSlot = Object.keys(inventoryRef).find((key) => inventoryRef[key] === item);
                if (originalSlot !== undefined) {
                    const newItem = { ...item, amount: Math.ceil(item.amount / 2) };
                    const nextSlot = this.findNextAvailableSlot(inventoryRef);
                    if (nextSlot !== null) {
                        inventoryRef[nextSlot] = newItem;
                        inventoryRef[originalSlot] = { ...item, amount: Math.floor(item.amount / 2) };
                        this.postInventoryData(inventoryType, inventoryType, originalSlot, nextSlot, item.amount, newItem.amount);
                    }
                }
            }
            this.showContextMenu = false;
        },
        toggleHotbar(data) {
            if (data.open) {
                this.hotbarItems = data.items;
                this.showHotbar = true;
            } else {
                this.showHotbar = false;
                this.hotbarItems = [];
            }
        },
        showItemNotification(itemData) {
            this.notificationText = itemData.item.label;
            this.notificationImage = "images/" + itemData.item.image;
            this.notificationType = itemData.type === "add" ? "Received" : itemData.type === "use" ? "Used" : "Removed";
            this.notificationAmount = itemData.amount || 1;
            this.showNotification = true;
            setTimeout(() => {
                this.showNotification = false;
            }, 3000);
        },
        showRequiredItem(data) {
            if (data.toggle) {
                this.requiredItems = data.items;
                this.showRequiredItems = true;
            } else {
                setTimeout(() => {
                    this.showRequiredItems = false;
                    this.requiredItems = [];
                }, 100);
            }
        },
        inventoryError(slot, inventory = "player") {
            const slotElement = document.querySelector(`.${inventory == "player" ? "player" : "other"}-inventory-section [data-slot="${slot}"]`);
            if (slotElement) {
                slotElement.classList.add("error");
            }
            axios.post("https://qb-inventory/PlayDropFail", {}).catch((error) => {
                console.error("Error playing drop fail:", error);
            });
            setTimeout(() => {
                if (slotElement) {
                    slotElement.classList.remove("error");
                }
            }, 1000);
        },
        copySerial() {
            if (!this.contextMenuItem) {
                return;
            }
            const item = this.contextMenuItem;
            if (item) {
                const el = document.createElement("textarea");
                el.value = item.info.serie;
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                document.body.removeChild(el);
            }
        },
        openWeaponAttachments() {
            if (!this.contextMenuItem) {
                return;
            }
            this.selectedWeapon = this.contextMenuItem;
            this.selectedWeaponAttachments = [];
            this.attachmentsLoading = true;
            this.showContextMenu = false;
            this.showWeaponAttachments = true;
            if (this.isStandalonePreview) {
                this.selectedWeaponAttachments = [
                    { attachment: "pistol_extendedclip", label: "Extended Clip" },
                    { attachment: "pistol_flashlight", label: "Flashlight" },
                    { attachment: "pistol_suppressor", label: "Suppressor" },
                ];
                this.attachmentsLoading = false;
                return;
            }
            axios
                .post("https://qb-inventory/GetWeaponData", JSON.stringify({ weapon: this.selectedWeapon.name, ItemData: this.selectedWeapon }))
                .then((response) => {
                    const list = response.data && response.data.AttachmentData;
                    this.selectedWeaponAttachments = Array.isArray(list) ? list : [];
                })
                .catch((error) => {
                    console.error(error);
                })
                .finally(() => {
                    this.attachmentsLoading = false;
                });
        },
        closeWeaponAttachments() {
            this.showWeaponAttachments = false;
            this.selectedWeapon = null;
            this.selectedWeaponAttachments = [];
            this.attachmentBusy = false;
        },
        attachmentLabel(a) {
            if (a.label) return a.label;
            return String(a.attachment || "")
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
        },
        removeAttachment(attachment) {
            if (!this.selectedWeapon || this.attachmentBusy) {
                return;
            }
            const index = this.selectedWeaponAttachments.indexOf(attachment);
            if (this.isStandalonePreview) {
                if (index !== -1) this.selectedWeaponAttachments.splice(index, 1);
                return;
            }
            this.attachmentBusy = true;
            axios
                .post("https://qb-inventory/RemoveAttachment", JSON.stringify({ AttachmentData: attachment, WeaponData: this.selectedWeapon }))
                .then((response) => {
                    const data = response.data || {};
                    if (data.WeaponData) this.selectedWeapon = data.WeaponData;
                    if (Array.isArray(data.Attachments)) {
                        this.selectedWeaponAttachments = data.Attachments;
                    } else if (index !== -1) {
                        this.selectedWeaponAttachments.splice(index, 1);
                    }
                    if (data.itemInfo) {
                        const nextSlot = this.findNextAvailableSlot(this.playerInventory);
                        if (nextSlot !== null) {
                            data.itemInfo.amount = 1;
                            this.playerInventory[nextSlot] = data.itemInfo;
                        }
                    }
                })
                .catch((error) => {
                    console.error(error);
                })
                .finally(() => {
                    this.attachmentBusy = false;
                });
        },
        generateTooltipContent(item) {
            if (!item) return "";
            const info = item.info || {};
            const desc = info.description || item.description || "No description available.";
            const segments = (value, max) => {
                let on = value > 0 ? Math.max(1, Math.round(Math.min(value / max, 1) * 10)) : 0;
                return Array.from({ length: 10 }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join("");
            };
            const bar = (label, value, max) => `<div class="tt-label">${label}</div><div class="tt-bar">${segments(value, max)}</div>`;
            const hidden = ["description", "display", "quality", "ammo", "clipSize", "maxAmmo"];
            let bars = "";
            if (info.quality !== undefined) bars += bar("Durability", info.quality, 100);
            if (info.ammo !== undefined) bars += bar("Clip", info.ammo, info.clipSize || info.maxAmmo || 30);
            let rows = "";
            if (info.display !== false) {
                for (const [key, value] of Object.entries(info)) {
                    if (hidden.includes(key)) continue;
                    const val = key === "attachments" ? (Object.keys(value).length > 0 ? "true" : "false") : value;
                    rows += `<div class="tt-row"><span>${this.formatKey(key)}</span><b>${val}</b></div>`;
                }
            }
            const type = (item.type || "item").replace(/^./, (c) => c.toUpperCase());
            const weight = item.weight !== undefined && item.weight !== null ? " &middot; " + (item.weight / 1000).toFixed(1) + "kg" : "";
            return `<div class="tt"><div class="tt-top"><div><div class="tt-name">${item.label}</div><div class="tt-sub">${type}${weight}</div></div><span class="tt-caret">&#9650;</span></div>${bars}${rows}<div class="tt-desc">${desc.replace(/\n/g, "<br>")}</div></div>`;
        },
        formatKey(key) {
            return key.replace(/_/g, " ").charAt(0).toUpperCase() + key.slice(1);
        },
        postInventoryData(fromInventory, toInventory, fromSlot, toSlot, fromAmount, toAmount) {
            let fromInventoryName = fromInventory === "other" ? this.otherInventoryName : fromInventory;
            let toInventoryName = toInventory === "other" ? this.otherInventoryName : toInventory;

            axios
                .post("https://qb-inventory/SetInventoryData", {
                    fromInventory: fromInventoryName,
                    toInventory: toInventoryName,
                    fromSlot,
                    toSlot,
                    fromAmount,
                    toAmount,
                })
                .then((response) => {
                    this.playInventorySound("move");
                    this.clearDragData();
                })
                .catch((error) => {
                    console.error("Error posting inventory data:", error);
                });
        },
    },
    mounted() {
        window.addEventListener("keydown", (event) => {
            const key = event.key;
            if (key === "Escape" || key === "Tab") {
                if (this.showWeaponAttachments) {
                    event.preventDefault();
                    this.closeWeaponAttachments();
                    return;
                }
                if (this.isInventoryOpen) {
                    this.closeInventory();
                }
            }
        });

        window.addEventListener("message", (event) => {
            switch (event.data.action) {
                case "open":
                    this.openInventory(event.data);
                    break;
                case "close":
                    this.closeInventory();
                    break;
                case "update":
                    this.updateInventory(event.data);
                    break;
                case "toggleHotbar":
                    this.toggleHotbar(event.data);
                    break;
                case "itemBox":
                    this.showItemNotification(event.data);
                    break;
                case "requiredItem":
                    this.showRequiredItem(event.data);
                    break;
                default:
                    console.warn(`Unexpected action: ${event.data.action}`);
            }
        });

        if (typeof GetParentResourceName !== "function") {
            document.body.classList.add("inventory-preview");
            this.isStandalonePreview = true;
            this.previewOtherInventory = [
                { name: "advancedlockpick", label: "Advanced Lockpick", amount: 1, type: "item", slot: 2, weight: 500, image: "advancedlockpick.png", info: {}, useable: true },
                { name: "armor", label: "Armor", amount: 2, type: "item", slot: 5, weight: 5000, image: "armor.png", info: {}, useable: true },
                { name: "radio", label: "Radio", amount: 1, type: "item", slot: 8, weight: 1000, image: "radio.png", info: {}, useable: true },
            ];
            this.openInventory({
                maxweight: 120000,
                slots: 40,
                inventory: [
                    { name: "water_bottle", label: "Water", amount: 3, type: "item", slot: 1, weight: 500, image: "water_bottle.png", info: {}, useable: true },
                    { name: "sandwich", label: "Sandwich", amount: 2, type: "item", slot: 2, weight: 200, image: "sandwich.png", info: {}, useable: true },
                    { name: "phone", label: "Phone", amount: 1, type: "item", slot: 3, weight: 700, image: "phone.png", info: {}, useable: true },
                    { name: "bandage", label: "Bandage", amount: 5, type: "item", slot: 4, weight: 100, image: "bandage.png", info: {}, useable: true },
                    { name: "weapon_pistol", label: "Pistol", amount: 1, type: "weapon", slot: 5, weight: 1000, image: "weapon_pistol.png", info: { quality: 86, ammo: 18, serie: "PREVIEW-001" }, useable: false },
                    { name: "pistol_ammo", label: "Pistol Ammo", amount: 24, type: "item", slot: 6, weight: 10, image: "pistol_ammo.png", info: {}, useable: true },
                    { name: "repairkit", label: "Repair Kit", amount: 1, type: "item", slot: 9, weight: 2500, image: "repairkit.png", info: {}, useable: true },
                    { name: "lockpick", label: "Lockpick", amount: 2, type: "item", slot: 12, weight: 300, image: "lockpick.png", info: {}, useable: true },
                ],
            });
            this.inventoryLabel = "Player";
        }
    },
    beforeUnmount() {
        window.removeEventListener("mousemove", () => {});
        window.removeEventListener("keydown", () => {});
        window.removeEventListener("message", () => {});
    },
});

const ICONS = {
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    backpack: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5M8 10h8"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12"/>',
    ground: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 20h16"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>',
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};
InventoryContainer.component("ico", {
    props: ["name"],
    computed: {
        paths() {
            return ICONS[this.name] || "";
        },
    },
    template: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="paths"></svg>`,
});
InventoryContainer.component("inv-slot", {
    props: ["item", "keyNum", "shop"],
    template: `<div class="item-slot" :class="{ filled: item }">
        <div class="item-slot-key" v-if="keyNum"><p>{{ keyNum }}</p></div>
        <template v-if="item">
            <div class="item-slot-img"><img :src="'images/' + item.image" alt="" /></div>
            <span class="slot-weight">{{ ((item.weight || 0) * item.amount / 1000).toFixed(1) }}kg</span>
            <div class="item-slot-amount"><p>x{{ item.amount }}</p></div>
            <div class="item-price" v-if="shop"><p>\${{ item.price }}</p></div>
            <div class="item-slot-durability"><div class="item-slot-durability-fill" :style="{ width: item.info && 'quality' in item.info ? item.info.quality + '%' : '0%' }" :class="item.info && item.info.quality > 75 ? 'high' : item.info && item.info.quality > 25 ? 'medium' : 'low'"></div></div>
        </template>
    </div>`,
});
InventoryContainer.use(FloatingVue);
InventoryContainer.mount("#app");
