import React, { useState, useEffect } from 'react';
import { Garden, MindNode } from './types';
import { SAMPLE_GARDENS, DEFAULT_GARDEN_NAME, INITIAL_ROOT_NODE } from './constants';
import { Icons } from './components/Icons';
import { GardenCanvas } from './components/GardenCanvas';
import { MindMapNode } from './components/MindMapNode';
import { Modal } from './components/Modal';
import { TextEditor } from './components/TextEditor';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [gardens, setGardens] = useState<Garden[]>(() => {
    const saved = localStorage.getItem('mindGarden_data');
    return saved ? JSON.parse(saved) : SAMPLE_GARDENS;
  });
  
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<MindNode | null>(null);
  const [isNewGardenModalOpen, setIsNewGardenModalOpen] = useState(false);
  const [newGardenName, setNewGardenName] = useState('');

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('mindGarden_data', JSON.stringify(gardens));
  }, [gardens]);

  const activeGarden = gardens.find(g => g.id === activeGardenId);

  // --- Actions ---

  const handleCreateGarden = () => {
    const name = newGardenName.trim() || DEFAULT_GARDEN_NAME;
    const newGarden: Garden = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      root: null // Start empty, user creates root
    };
    setGardens([...gardens, newGarden]);
    setNewGardenName('');
    setIsNewGardenModalOpen(false);
    setActiveGardenId(newGarden.id);
  };

  const handleCreateRoot = () => {
    if (!activeGardenId) return;
    const root: MindNode = { ...INITIAL_ROOT_NODE, id: uuidv4() };
    updateGardenRoot(activeGardenId, root);
  };

  const updateGardenRoot = (gardenId: string, newRoot: MindNode | null) => {
    setGardens(gardens.map(g => g.id === gardenId ? { ...g, root: newRoot } : g));
  };

  // Recursive function to find and update a node
  const modifyNode = (root: MindNode, nodeId: string, callback: (node: MindNode) => MindNode): MindNode => {
    if (root.id === nodeId) return callback(root);
    return {
      ...root,
      children: root.children.map(child => modifyNode(child, nodeId, callback))
    };
  };

  // Recursive find
  const findNode = (root: MindNode, nodeId: string): MindNode | null => {
    if (root.id === nodeId) return root;
    for (const child of root.children) {
      const found = findNode(child, nodeId);
      if (found) return found;
    }
    return null;
  };

  // Recursive delete
  const deleteNode = (root: MindNode, nodeId: string): MindNode | null => {
    if (root.id === nodeId) return null; // Should handle root deletion separately
    return {
      ...root,
      children: root.children
        .map(child => deleteNode(child, nodeId))
        .filter((n): n is MindNode => n !== null)
    };
  };

  const handleAddChild = (parentId: string) => {
    if (!activeGarden || !activeGarden.root) return;
    
    const newNode: MindNode = {
      id: uuidv4(),
      title: 'Yeni Fikir',
      content: '',
      children: []
    };

    const newRoot = modifyNode(activeGarden.root, parentId, (node) => ({
      ...node,
      children: [...node.children, newNode]
    }));

    updateGardenRoot(activeGarden.id, newRoot);
    // Optionally auto-open edit for new node
    setEditingNode(newNode);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!activeGarden || !activeGarden.root) return;
    
    // If deleting root
    if (activeGarden.root.id === nodeId) {
      if (window.confirm("Bütün ağacı silmek istediğine emin misin?")) {
        updateGardenRoot(activeGarden.id, null);
      }
      return;
    }

    const newRoot = deleteNode(activeGarden.root, nodeId);
    updateGardenRoot(activeGarden.id, newRoot);
  };

  const handleSaveNode = (title: string, content: string) => {
    if (!activeGarden || !activeGarden.root || !editingNode) return;

    const newRoot = modifyNode(activeGarden.root, editingNode.id, (node) => ({
      ...node,
      title,
      content
    }));
    
    updateGardenRoot(activeGarden.id, newRoot);
    setEditingNode(null);
  };

  // --- Views ---

  if (activeGarden) {
    return (
      <div className="h-screen w-screen flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between px-6 z-40 relative shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveGardenId(null)}
              className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
            >
              <Icons.Back size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-earth-800 font-serif">{activeGarden.name}</h1>
              <p className="text-xs text-stone-400">Infinite Garden Canvas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-leaf-50 text-leaf-700 rounded-full text-xs font-semibold border border-leaf-100">
              Otomatik Kayıt Aktif
            </div>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <GardenCanvas>
            {activeGarden.root ? (
              <ul>
                <MindMapNode 
                  node={activeGarden.root}
                  onAddChild={handleAddChild}
                  onDelete={handleDeleteNode}
                  onEdit={setEditingNode}
                  depth={0}
                />
              </ul>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={handleCreateRoot}
                  className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-dashed border-stone-300 hover:border-leaf-400 hover:bg-leaf-50/50 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-leaf-100 text-leaf-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icons.Seed size={32} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-stone-700">İlk Tohumu Ek</h3>
                    <p className="text-stone-500 text-sm">Düşünce ağacını başlatmak için tıkla</p>
                  </div>
                </button>
              </div>
            )}
          </GardenCanvas>
        </div>

        {/* Editor Modal */}
        <Modal 
          isOpen={!!editingNode} 
          onClose={() => setEditingNode(null)}
          title="Düşünceyi Düzenle"
        >
          {editingNode && (
            <TextEditor
              initialTitle={editingNode.title}
              initialContent={editingNode.content}
              onSave={handleSaveNode}
              onClose={() => setEditingNode(null)}
            />
          )}
        </Modal>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-earth-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-serif font-bold text-earth-900 mb-2">MindGarden</h1>
            <p className="text-stone-500">Fikirlerinizi yeşertin ve büyütün.</p>
          </div>
          <button 
            onClick={() => setIsNewGardenModalOpen(true)}
            className="bg-earth-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-earth-200 hover:bg-earth-700 hover:translate-y-[-2px] transition-all flex items-center gap-2 font-semibold"
          >
            <Icons.Add size={20} />
            Yeni Bahçe
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gardens.map(garden => (
            <div 
              key={garden.id}
              onClick={() => setActiveGardenId(garden.id)}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl hover:border-leaf-200 cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icons.Garden size={80} className="text-leaf-600" />
              </div>
              
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-leaf-50 rounded-xl text-leaf-600">
                  <Icons.Garden size={24} />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-stone-800 mb-2 group-hover:text-leaf-700 transition-colors">
                {garden.name}
              </h3>
              <p className="text-sm text-stone-400">
                Oluşturuldu: {new Date(garden.createdAt).toLocaleDateString('tr-TR')}
              </p>
              
              <div className="mt-6 flex items-center text-sm font-medium text-leaf-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                Bahçeye Gir <Icons.Move size={16} className="ml-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Garden Modal */}
      <Modal
        isOpen={isNewGardenModalOpen}
        onClose={() => setIsNewGardenModalOpen(false)}
        title="Yeni Bahçe Oluştur"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Bahçe Adı</label>
            <input 
              type="text" 
              value={newGardenName}
              onChange={(e) => setNewGardenName(e.target.value)}
              placeholder="Örn: Yapay Zeka Projesi"
              className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-earth-200 focus:border-earth-400 outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGarden()}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={() => setIsNewGardenModalOpen(false)}
              className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button 
              onClick={handleCreateGarden}
              className="px-6 py-2 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition-colors shadow-lg shadow-earth-100"
            >
              Oluştur
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
