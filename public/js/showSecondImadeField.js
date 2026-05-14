// for boxed input
const fileInput = document.getElementById("fileInput");
const previewImage = document.getElementById("previewImage");
const plusIcon = document.getElementById("plusIcon");

function clearMainPreview() {
  // remove existing video preview if any
  const existingVideo = document.getElementById("previewVideo");
  if (existingVideo) {
    existingVideo.pause && existingVideo.pause();
    existingVideo.src = "";
    existingVideo.remove();
  }
  if (previewImage) {
    previewImage.src = "";
    previewImage.classList.add("d-none");
  }
  if (plusIcon) plusIcon.classList.remove("d-none");
}

if (fileInput) {
  fileInput.addEventListener("change", function () {
    clearMainPreview();
    const file = this.files && this.files[0];
    if (file) {
      // if image, show in <img>; if video, create a <video> element
      if (file.type && file.type.startsWith("image")) {
        const reader = new FileReader();
        reader.onload = function () {
          previewImage.src = reader.result;
          previewImage.classList.remove("d-none");
          plusIcon.classList.add("d-none");
        };
        reader.readAsDataURL(file);
      } else if (file.type && file.type.startsWith("video")) {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.id = "previewVideo";
        video.className = "position-absolute top-0 start-0 w-100 h-100 object-fit-cover";
        video.src = url;
        video.controls = false;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        // insert video into label before existing img
        if (previewImage && previewImage.parentNode) {
          previewImage.parentNode.appendChild(video);
          previewImage.classList.add("d-none");
        }
        plusIcon.classList.add("d-none");
      } else {
        // unknown file type: show filename as fallback
        const filenameSpan = document.createElement("span");
        filenameSpan.id = "previewFilename";
        filenameSpan.className = "position-absolute top-50 start-50 translate-middle text-break";
        filenameSpan.textContent = file.name;
        if (previewImage && previewImage.parentNode) previewImage.parentNode.appendChild(filenameSpan);
        plusIcon.classList.add("d-none");
      }
    } else {
      clearMainPreview();
    }
  });
}

// second (back) image preview
const fileInput2 = document.getElementById("image2");
const previewImage2 = document.getElementById("previewImage2");
const plusIcon2 = document.getElementById("plusIcon2");

if (fileInput2) {
  fileInput2.addEventListener("change", function () {
    const file = this.files && this.files[0];
    const existingVideo2 = document.getElementById("previewVideo2");
    if (existingVideo2) {
      existingVideo2.pause && existingVideo2.pause();
      existingVideo2.src = "";
      existingVideo2.remove();
    }
    // remove any previous filename fallback
    const existingFilename = document.getElementById("previewFilename2");
    if (existingFilename) existingFilename.remove();

    if (file) {
      if (file.type && file.type.startsWith("image")) {
        const reader = new FileReader();
        reader.onload = function () {
          if (previewImage2) {
            previewImage2.src = reader.result;
            previewImage2.classList.remove("d-none");
          }
          if (plusIcon2) plusIcon2.classList.add("d-none");
          const fileLabel2El = document.getElementById("fileLabel2");
          const fileFeedback2El = document.getElementById("fileInvalidFeedback2");
          if (fileLabel2El) fileLabel2El.classList.remove("is-invalid-border");
          if (fileFeedback2El) {
            fileFeedback2El.classList.add("d-none");
            fileFeedback2El.classList.remove("d-block");
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type && file.type.startsWith("video")) {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.id = "previewVideo2";
        video.className = "position-absolute top-0 start-0 w-100 h-100 object-fit-cover";
        video.src = url;
        video.controls = false;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        if (previewImage2 && previewImage2.parentNode) {
          previewImage2.parentNode.appendChild(video);
          previewImage2.classList.add("d-none");
        }
        if (plusIcon2) plusIcon2.classList.add("d-none");
      } else {
        const filenameSpan = document.createElement("span");
        filenameSpan.id = "previewFilename2";
        filenameSpan.className = "position-absolute top-50 start-50 translate-middle text-break";
        filenameSpan.textContent = file.name;
        if (previewImage2 && previewImage2.parentNode) previewImage2.parentNode.appendChild(filenameSpan);
        if (plusIcon2) plusIcon2.classList.add("d-none");
      }
    } else {
      if (previewImage2) previewImage2.classList.add("d-none");
      if (plusIcon2) plusIcon2.classList.remove("d-none");
    }
  });
}

(function () {
  const fileInput = document.getElementById("fileInput");
  const fileLabel = document.getElementById("fileLabel");
  const plusIcon = document.getElementById("plusIcon");
  const previewImage = document.getElementById("previewImage");
  const fileFeedback = document.getElementById("fileInvalidFeedback");
  const fileInput2 = document.getElementById("image2");
  const fileLabel2 = document.getElementById("fileLabel2");
  const plusIcon2 = document.getElementById("plusIcon2");
  const previewImage2 = document.getElementById("previewImage2");
  const fileFeedback2 = document.getElementById("fileInvalidFeedback2");
  const form = document.querySelector("form.needs-validation");

  if (form) {
    form.addEventListener("submit", function (e) {
      // clear previous state for first and second inputs
      if (fileLabel) fileLabel.classList.remove("is-invalid-border");
      if (fileFeedback) {
        fileFeedback.classList.add("d-none");
        fileFeedback.classList.remove("d-block");
      }
      if (fileLabel2) fileLabel2.classList.remove("is-invalid-border");
      if (fileFeedback2) {
        fileFeedback2.classList.add("d-none");
        fileFeedback2.classList.remove("d-block");
      }

      // allow empty file input when an existing preview image is present (edit form)
      if (!fileInput.files || fileInput.files.length === 0) {
        const hasExistingPreview = previewImage && previewImage.src && previewImage.src.trim() !== "";
        if (!hasExistingPreview) {
          e.preventDefault();
          e.stopPropagation();
          if (fileLabel) fileLabel.classList.add("is-invalid-border");
          if (fileFeedback) {
            fileFeedback.classList.remove("d-none");
            fileFeedback.classList.add("d-block");
          }
          form.classList.add("was-validated");
          // focus the label for accessibility
          fileLabel && fileLabel.focus();
          return;
        }
      }

      const page2FieldDiv = document.getElementById("page2Field");
      if (page2FieldDiv && page2FieldDiv.style.display !== "none") {
        if (!fileInput2 || !fileInput2.files || fileInput2.files.length === 0) {
          const hasExistingPreview2 = previewImage2 && previewImage2.src && previewImage2.src.trim() !== "";
          if (!hasExistingPreview2) {
            e.preventDefault();
            e.stopPropagation();
            if (fileLabel2) fileLabel2.classList.add("is-invalid-border");
            if (fileFeedback2) {
              fileFeedback2.classList.remove("d-none");
              fileFeedback2.classList.add("d-block");
            }
            form.classList.add("was-validated");
            fileLabel2 && fileLabel2.focus();
            return;
          }
        }
      }

      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        form.classList.add("was-validated");
      }
    });
  }
})();
