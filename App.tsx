import React, { useState, useCallback } from 'react';
import { UploadedImage, EditedImageResult } from './types';
import { editImageWithGemini } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import { WandIcon, Spinner } from './components/IconDefs';

const Header = () => (
  <header className="text-center p-6 md:p-8">
    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
      AI Photo Studio
    </h1>
    <p className="text-medium-text mt-2">Edit your photos with a simple text prompt using Gemini.</p>
  </header>
);

const ImageCard: React.FC<{ title: string; imageUrl: string }> = ({ title, imageUrl }) => (
  <div className="bg-dark-card rounded-lg overflow-hidden border border-dark-border shadow-lg">
    <h3 className="text-center font-semibold text-light-text p-3 bg-gray-900/50">{title}</h3>
    <div className="p-2">
      <img src={imageUrl} alt={title} className="w-full h-auto object-contain rounded-md aspect-square" />
    </div>
  </div>
);

const ResultPlaceholder: React.FC<{ isLoading: boolean; text?: string }> = ({ isLoading, text }) => (
  <div className="bg-dark-card rounded-lg border border-dark-border shadow-lg flex flex-col items-center justify-center aspect-square p-4">
    {isLoading ? (
      <>
        <Spinner />
        <p className="mt-4 text-medium-text text-center">AI is working its magic...</p>
        <p className="mt-2 text-sm text-gray-500 text-center">This can take a moment.</p>
      </>
    ) : (
      <>
        <div className="w-16 h-16 bg-gray-900/50 rounded-full flex items-center justify-center mb-4">
          <WandIcon />
        </div>
        <h3 className="text-center font-semibold text-light-text">Edited Image</h3>
        <p className="text-medium-text text-center text-sm mt-2">{text || 'Your edited image will appear here.'}</p>
      </>
    )}
  </div>
);

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [editedResult, setEditedResult] = useState<EditedImageResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleImageUpload = useCallback((image: UploadedImage) => {
    setOriginalImage(image);
    setEditedResult(null);
    setError(null);
  }, []);

  const handleNewUpload = () => {
    setOriginalImage(null);
    setEditedResult(null);
    setPrompt('');
    setError(null);
  };
  
  const handleSubmit = async () => {
    if (!originalImage || !prompt.trim()) {
      setError("Please provide an image and a descriptive prompt.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setEditedResult(null);

    try {
      const result = await editImageWithGemini(originalImage, prompt);
      setEditedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-light-text font-sans antialiased">
      <Header />
      <main className="container mx-auto px-4 pb-12">
        {error && (
          <div className="max-w-4xl mx-auto bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {!originalImage ? (
          <ImageUploader onImageUpload={handleImageUpload} setAppError={setError} />
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <ImageCard title="Original" imageUrl={originalImage.dataUrl} />
              {editedResult ? (
                 <ImageCard title="Edited" imageUrl={editedResult.imageUrl} />
              ) : (
                <ResultPlaceholder isLoading={isLoading} text={editedResult?.text}/>
              )}
            </div>
             {editedResult?.text && <p className="text-center text-medium-text italic mb-6 p-4 bg-dark-card border border-dark-border rounded-lg">{editedResult.text}</p>}

            <div className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the edit, e.g., 'add a cute cat wearing a wizard hat next to the person'"
                className="w-full p-3 bg-gray-900/50 rounded-md border border-dark-border focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-none"
                rows={3}
                disabled={isLoading}
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full flex items-center justify-center px-6 py-3 bg-brand-primary text-white font-semibold rounded-md hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card focus:ring-brand-primary transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  <WandIcon />
                  {isLoading ? 'Generating...' : 'Generate Edit'}
                </button>
                <button
                  onClick={handleNewUpload}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-dark-border text-light-text font-semibold rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card focus:ring-gray-500 transition duration-200 disabled:opacity-50"
                >
                  Upload New Image
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="text-center p-4 text-medium-text text-sm">
        <p>Powered by Google Gemini. Built for creative exploration.</p>
      </footer>
    </div>
  );
};

export default App;
