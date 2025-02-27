import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./ImageUploader.css";

const ImageUploader = () => {
  // State variables for managing component data
  const [file, setFile] = useState(null); // Selected file
  const [previewUrl, setPreviewUrl] = useState(null); // URL for image preview
  const [uploading, setUploading] = useState(false); // Upload status
  const [images, setImages] = useState([]); // List of uploaded images
  const [title, setTitle] = useState(""); // Image title
  const [description, setDescription] = useState(""); // Image description
  const [selectedImage, setSelectedImage] = useState(null); // Image for full-screen view
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // Track image being deleted

  // Load images when component mounts
  useEffect(() => {
    fetchImages();
  }, []);

  // Function to fetch images from the database
  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from("images")
        .select("id, url, title, description");

      if (error) throw error;
      setImages(data);
    } catch (error) {
      console.error("Error fetching images:", error.message);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      // Create a preview URL for the selected image
      setPreviewUrl(URL.createObjectURL(uploadedFile));
    }
  };

  // Upload the image to storage and save metadata to database
  const handleUpload = async () => {
    // Validate inputs
    if (!file) return alert("Please select a file first!");
    if (!title.trim()) return alert("Please enter a title!");
    if (!description.trim()) return alert("Please enter a description!");

    try {
      setUploading(true);

      // Create a unique filename using timestamp
      const fileName = `${Date.now()}-${file.name}`;

      // Step 1: Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("sharing-notes")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Step 2: Get the public URL for the uploaded file
      const { data: publicURLData } = supabase.storage
        .from("sharing-notes")
        .getPublicUrl(fileName);

      const imageUrl = publicURLData.publicUrl;

      // Step 3: Save image metadata to database
      const { data: insertData, error: dbError } = await supabase
        .from("images")
        .insert([{ url: imageUrl, title, description }])
        .select();

      if (dbError) throw dbError;

      // Step 4: Update UI state
      setImages((prevImages) => [...prevImages, insertData[0]]);

      // Reset form fields
      setTitle("");
      setDescription("");
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
      alert("Upload failed: " + error.message);
      console.error("Upload error:", error.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete an image from storage and database
  const handleDelete = async (id, imageUrl) => {
    // Set the ID for confirmation or execute delete if already confirmed
    if (deleteConfirmId === id) {
      try {
        // Extract filename from the URL
        const fileName = imageUrl.split("/").slice(-1)[0];

        // Step 1: Delete file from storage
        const { error: storageError } = await supabase.storage
          .from("sharing-notes")
          .remove([fileName]);

        if (storageError) throw storageError;

        // Step 2: Delete metadata from database
        const { error: dbError } = await supabase
          .from("images")
          .delete()
          .eq("id", id);

        if (dbError) throw dbError;

        // Step 3: Update UI by removing the deleted image
        setImages((prevImages) => prevImages.filter((img) => img.id !== id));

        // Reset confirmation state
        setDeleteConfirmId(null);
      } catch (error) {
        console.error("Error deleting image:", error.message);
        alert("Failed to delete image. Please try again.");
        setDeleteConfirmId(null);
      }
    } else {
      // Set confirmation state to this image
      setDeleteConfirmId(id);

      // Auto-clear confirmation after 3 seconds
      setTimeout(() => {
        setDeleteConfirmId(null);
      }, 3000);
    }
  };

  // Download image function
  const handleDownload = async (imageUrl, imageTitle) => {
    try {
      // Show download indicator
      const downloadButton = document.querySelector(
        `[data-image-id="${imageTitle}"]`
      );
      if (downloadButton) {
        downloadButton.textContent = "Downloading...";
        downloadButton.disabled = true;
      }

      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create a temporary download link
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(blob);

      // Set filename for download
      downloadLink.download = `${imageTitle || "image"}.jpg`;

      // Append to document, trigger click, and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Reset button
      if (downloadButton) {
        downloadButton.textContent = "Download";
        downloadButton.disabled = false;
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download image");

      // Reset button on error
      const downloadButton = document.querySelector(
        `[data-image-id="${imageTitle}"]`
      );
      if (downloadButton) {
        downloadButton.textContent = "Download";
        downloadButton.disabled = false;
      }
    }
  };

  return (
    <div className="image-uploader-container">
      {/* Upload Form Section */}
      <h2>Notes sharing</h2>
      <div className="upload-box">
        <input type="file" onChange={handleFileChange} accept="image/*" />
        <input
          type="text"
          placeholder="Enter Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Enter Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={handleUpload} disabled={uploading}>
          {uploading ? (
            <>
              <span className="loading-spinner"></span>
              Uploading...
            </>
          ) : (
            "Upload Image"
          )}
        </button>
      </div>

      {/* Image Preview Section */}
      {previewUrl && (
        <div className="preview">
          <p>Preview before upload:</p>
          <img src={previewUrl} alt="Preview" />
        </div>
      )}

      {/* Image Gallery Section */}
      <h3>Uploaded Images</h3>

      {images.length === 0 ? (
        <div className="empty-state">
          <p>No images uploaded yet. Add some images to see them here!</p>
        </div>
      ) : (
        <div className="image-grid">
          {images.map((image) => (
            <div key={image.id} className="image-card">
              <h4>{image.title}</h4>
              <img
                src={image.url}
                alt={image.title}
                onClick={() => setSelectedImage(image.url)} // Open full-screen view
              />
              <p>{image.description}</p>
              <div className="image-actions">
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(image.id, image.url)}
                >
                  {deleteConfirmId === image.id ? "Confirm Delete" : "Delete"}
                </button>
                <button
                  className="btn-download"
                  onClick={() => handleDownload(image.url, image.title)}
                  data-image-id={image.title}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Image Modal */}
      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full Screen" className="modal-image" />
          <button
            className="close-button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
          >
            ✖
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
