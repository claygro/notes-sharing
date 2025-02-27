import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./ImageUploader.css"; // Import external CSS

const ImageUploader = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState(null); // State to track full-screen image

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from("images")
      .select("id, url, title, description");
    if (error) {
      console.error("Error fetching images:", error.message);
    } else {
      setImages(data);
    }
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setPreviewUrl(URL.createObjectURL(uploadedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");
    if (!title.trim()) return alert("Please enter a title!");
    if (!description.trim()) return alert("Please enter a description!");

    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("sharing-notes")
      .upload(fileName, file, { upsert: true });

    if (error) {
      console.error("Upload error:", error.message);
      alert("Upload failed: " + error.message);
    } else {
      const { data: publicURLData } = supabase.storage
        .from("sharing-notes")
        .getPublicUrl(fileName);

      const imageUrl = publicURLData.publicUrl;

      const { data: insertData, error: dbError } = await supabase
        .from("images")
        .insert([{ url: imageUrl, title, description }])
        .select();

      if (dbError) {
        console.error("Error saving image:", dbError.message);
      } else {
        setImages((prevImages) => [...prevImages, insertData[0]]);
        setTitle("");
        setDescription("");
        setFile(null);
        setPreviewUrl(null);
      }
    }

    setUploading(false);
  };

  const handleDelete = async (id, imageUrl) => {
    const fileName = imageUrl.split("/").slice(-1)[0];

    const { error: storageError } = await supabase.storage
      .from("sharing-notes")
      .remove([fileName]);

    if (storageError) {
      console.error("Error deleting image from storage:", storageError.message);
      return;
    }

    const { error: dbError } = await supabase
      .from("images")
      .delete()
      .eq("id", id);

    if (dbError) {
      console.error("Error deleting image from database:", dbError.message);
      return;
    }

    setImages((prevImages) => prevImages.filter((img) => img.id !== id));
  };

  return (
    <div className="image-uploader-container">
      <h2>Upload Image</h2>
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
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {previewUrl && (
        <div className="preview">
          <p>Preview before upload:</p>
          <img src={previewUrl} alt="Preview" />
        </div>
      )}

      <h3>Uploaded Images:</h3>
      <div className="image-grid">
        {images.map((image) => (
          <div key={image.id} className="image-card">
            <h4>{image.title}</h4>
            <img
              src={image.url}
              alt={image.title}
              onClick={() => setSelectedImage(image.url)} // Click to open in full-screen
            />
            <p>{image.description}</p>
            <button onClick={() => handleDelete(image.id, image.url)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Full-Screen Image Modal */}
      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full Screen" className="modal-image" />
          <button
            className="close-button"
            onClick={() => setSelectedImage(null)}
          >
            ✖ Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
