import type { ModalOptions } from "../types";
import {
  modalCancelBtn,
  modalCloseBtn,
  modalConfirmBtn,
  modalInput,
  modalMessage,
  modalOverlay,
  modalTitle,
} from "./dom";

let alertTimeoutId: ReturnType<typeof setTimeout> | null = null;
const ALERT_DURATION = 2000;

export const showAlert = (message: string, highlightText?: string): void => {
  const status = document.getElementById("status-css");
  if (!status) return;

  const isAlreadyActive = status.classList.contains("active");

  status.replaceChildren();
  if (highlightText) {
    const parts = message.split(highlightText);
    if (parts.length === 2) {
      status.appendChild(document.createTextNode(parts[0]));
      const pre = document.createElement("pre");
      pre.textContent = highlightText;
      status.appendChild(pre);
      status.appendChild(document.createTextNode(parts[1]));
    } else {
      status.textContent = message;
    }
  } else {
    status.textContent = message;
  }

  status.classList.add("active");

  if (alertTimeoutId) {
    clearTimeout(alertTimeoutId);
  }

  const duration = isAlreadyActive ? ALERT_DURATION * 2 : ALERT_DURATION;

  alertTimeoutId = setTimeout(() => {
    status.classList.remove("active");
    setTimeout(() => {
      status.replaceChildren();
    }, 200);
    alertTimeoutId = null;
  }, duration);
};

export function showModal(options: ModalOptions): Promise<string | null> {
  return new Promise(resolve => {
    modalTitle.textContent = options.title;
    modalMessage.innerHTML = options.message;
    modalConfirmBtn.textContent = options.confirmText || "Confirm";
    modalCancelBtn.textContent = options.cancelText || "Cancel";

    if (options.confirmDanger) {
      modalConfirmBtn.classList.add("modal-btn-danger");
      modalConfirmBtn.classList.remove("modal-btn-primary");
    } else {
      modalConfirmBtn.classList.add("modal-btn-primary");
      modalConfirmBtn.classList.remove("modal-btn-danger");
    }

    if (options.showInput) {
      modalInput.style.display = "block";
      modalInput.placeholder = options.inputPlaceholder || "";
      modalInput.value = options.inputValue || "";
      modalMessage.style.marginBottom = "1rem";
    } else {
      modalInput.style.display = "none";
      modalMessage.style.marginBottom = "0";
    }

    modalOverlay.style.display = "flex";

    requestAnimationFrame(() => {
      modalOverlay.classList.add("active");
    });

    if (options.showInput) {
      setTimeout(() => {
        modalInput.focus();
        modalInput.select();
      }, 100);
    }

    const cleanup = (withAnimation = true) => {
      if (withAnimation) {
        const modal = modalOverlay.querySelector(".modal");
        if (modal) {
          modal.classList.add("closing");
        }
        modalOverlay.classList.remove("active");

        setTimeout(() => {
          modalOverlay.style.display = "none";
          if (modal) {
            modal.classList.remove("closing");
          }
        }, 200);
      } else {
        modalOverlay.classList.remove("active");
        modalOverlay.style.display = "none";
      }

      modalConfirmBtn.onclick = null;
      modalCancelBtn.onclick = null;
      modalCloseBtn.onclick = null;
      modalOverlay.onclick = null;
      modalInput.onkeydown = null;
      document.onkeydown = null;
    };

    const handleConfirm = () => {
      const value = options.showInput ? modalInput.value : "confirmed";
      cleanup();
      resolve(value);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    modalConfirmBtn.onclick = handleConfirm;
    modalCancelBtn.onclick = handleCancel;
    modalCloseBtn.onclick = handleCancel;

    modalOverlay.onclick = e => {
      if (e.target === modalOverlay) {
        handleCancel();
      }
    };

    modalInput.onkeydown = e => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };

    document.onkeydown = e => {
      if (e.key === "Escape" && modalOverlay.classList.contains("active")) {
        e.preventDefault();
        handleCancel();
      }
    };
  });
}

export async function showPrompt(
  title: string,
  message: string,
  defaultValue = "",
  placeholder = "",
  confirmText = "OK"
): Promise<string | null> {
  return showModal({
    title,
    message,
    inputValue: defaultValue,
    inputPlaceholder: placeholder,
    showInput: true,
    confirmText,
  });
}

export async function showConfirm(
  title: string,
  message: string,
  danger = false,
  confirmText?: string
): Promise<boolean> {
  const result = await showModal({
    title,
    message,
    showInput: false,
    confirmText: confirmText || (danger ? "Delete" : "OK"),
    confirmDanger: danger,
  });
  return result !== null;
}
