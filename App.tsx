import React, { useState, useCallback } from 'react';
import { UploadedImage, EditedImageResult } from './types';
import { editImageWithGemini, getInitializationError } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import { WandIcon, Spinner, DownloadIcon } from './components/IconDefs';

declare var JSZip: any;

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

const ResultsPanel: React.FC<{ results: EditedImageResult[], isLoading: boolean }> = ({ results, isLoading }) => (
    <div className="relative bg-dark-card rounded-lg border border-dark-border shadow-lg flex flex-col aspect-square">
        {isLoading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg transition-opacity duration-300">
                <Spinner />
                <p className="mt-4 text-light-text text-center">AI is working its magic...</p>
                <p className="mt-2 text-sm text-gray-500 text-center">This can take a moment.</p>
            </div>
        )}
        {results.length === 0 && !isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 bg-gray-900/50 rounded-full flex items-center justify-center mb-4">
                    <WandIcon />
                </div>
                <h3 className="text-center font-semibold text-light-text">Edited Images</h3>
                <p className="text-medium-text text-center text-sm mt-2">Your edited images will appear here.</p>
            </div>
        ) : (
            <div className="p-2 space-y-4 overflow-y-auto h-full">
                {results.slice().reverse().map((result, index) => (
                    <div key={results.length - 1 - index} className="p-2 bg-gray-900/50 rounded-lg">
                        <img src={result.imageUrl} alt={`Edit ${results.length - index}`} className="w-full h-auto object-contain rounded-md" />
                        {result.text && <p className="text-center text-medium-text text-xs italic mt-2 p-2">{result.text}</p>}
                    </div>
                ))}
            </div>
        )}
    </div>
);


const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [editedResults, setEditedResults] = useState<EditedImageResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(getInitializationError());
  
  const handleImageUpload = useCallback((image: UploadedImage) => {
    setOriginalImage(image);
    setEditedResults([]);
    setError(null);
  }, []);

  const handleNewUpload = () => {
    setOriginalImage(null);
    setEditedResults([]);
    setPrompt('');
    setError(getInitializationError());
  };

  const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 50);

  const handleDownloadAll = async () => {
      if (!originalImage || editedResults.length === 0) {
          setError("No images to download.");
          return;
      }
      if (typeof JSZip === 'undefined') {
          setError("Could not find the JSZip library. Download failed.");
          return;
      }

      setIsLoading(true);
      setError(null);
      try {
          const zip = new JSZip();

          const originalExt = originalImage.mimeType.split('/')[1] || 'png';
          const originalBlob = await (await fetch(originalImage.dataUrl)).blob();
          zip.file(`original.${originalExt}`, originalBlob);

          const downloadPromises = editedResults.map(async (result, index) => {
              const resultBlob = await (await fetch(result.imageUrl)).blob();
              const promptPart = result.prompt ? sanitizeFilename(result.prompt) : `edit_${index + 1}`;
              zip.file(`edit_${index + 1}_${promptPart}.png`, resultBlob);
          });
          await Promise.all(downloadPromises);
          
          const content = await zip.generateAsync({ type: "blob" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(content);
          link.download = "ai_photo_studio_edits.zip";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

      } catch (err) {
          setError(err instanceof Error ? `Download failed: ${err.message}` : "An unknown error occurred during download.");
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleSubmit = async () => {
    if (!originalImage || !prompt.trim()) {
      setError("Please provide an image and a descriptive prompt.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const result = await editImageWithGemini(originalImage, prompt);
      setEditedResults(prev => [...prev, {...result, prompt: prompt}]);
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
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <ImageCard title="Original" imageUrl={originalImage.dataUrl} />
              <ResultsPanel results={editedResults} isLoading={isLoading} />
            </div>

            <div className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the edit, e.g., 'add a cute cat wearing a wizard hat next to the person'"
                className="w-full p-3 bg-gray-900/50 rounded-md border border-dark-border focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-none"
                rows={3}
                disabled={isLoading}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !prompt.trim() || !!getInitializationError()}
                  className="w-full flex items-center justify-center px-6 py-3 bg-brand-primary text-white font-semibold rounded-md hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card focus:ring-brand-primary transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed lg:col-span-1"
                >
                  <WandIcon />
                  {isLoading ? 'Generating...' : 'Generate Edit'}
                </button>
                 <button
                  onClick={handleDownloadAll}
                  disabled={isLoading || editedResults.length === 0}
                  className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card focus:ring-green-500 transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  <DownloadIcon />
                  Download All as ZIP
                </button>
                <button
                  onClick={handleNewUpload}
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-dark-border text-light-text font-semibold rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card focus:ring-gray-500 transition duration-200 disabled:opacity-50"
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
