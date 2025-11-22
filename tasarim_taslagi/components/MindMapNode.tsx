import React, { useState } from 'react';
import { MindNode } from '../types';
import { Icons } from './Icons';

interface MindMapNodeProps {
  node: MindNode;
  onAddChild: (parentId: string) => void;
  onAddSibling?: (siblingId: string) => void;
  onDelete: (nodeId: string) => void;
  onEdit: (node: MindNode) => void;
  depth: number;
}

export const MindMapNode: React.FC<MindMapNodeProps> = ({ 
  node, 
  onAddChild, 
  onAddSibling, 
  onDelete, 
  onEdit,
  depth 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${node.title}\n\n${node.content}`);
    // Could show a toast here
  };

  // Determine node color based on depth for visual hierarchy
  const getBgColor = (d: number) => {
    if (d === 0) return 'bg-earth-600 text-white shadow-earth-200';
    if (d === 1) return 'bg-leaf-500 text-white shadow-leaf-200';
    return 'bg-white text-stone-800 border-2 border-stone-100 shadow-stone-100';
  };

  const getTextColor = (d: number) => {
    if (d <= 1) return 'text-white';
    return 'text-stone-700';
  };

  return (
    <li>
      <div 
        className="relative inline-block group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover Toolbar */}
        <div className={`
          absolute -top-10 left-1/2 transform -translate-x-1/2 
          flex items-center gap-1 bg-white p-1.5 rounded-full shadow-lg border border-stone-100
          transition-all duration-200 z-20
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
        `}>
          <button 
            onClick={() => onEdit(node)} 
            className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
            title="Düzenle"
          >
            <Icons.Edit size={14} />
          </button>
          <button 
            onClick={handleCopy} 
            className="p-1.5 text-stone-500 hover:text-earth-600 hover:bg-earth-50 rounded-full"
            title="Kopyala"
          >
            <Icons.Copy size={14} />
          </button>
          {depth > 0 && (
             <button 
             onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} 
             className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-full"
             title="Sil"
           >
             <Icons.Delete size={14} />
           </button>
          )}
          
          {/* Add Sibling Button (Only if not root) */}
          {onAddSibling && (
             <button 
             onClick={(e) => { e.stopPropagation(); onAddSibling(node.id); }} 
             className="p-1.5 text-stone-500 hover:text-purple-600 hover:bg-purple-50 rounded-full"
             title="Yan Dal Ekle"
           >
             <Icons.Branch size={14} />
           </button>
          )}
        </div>

        {/* Main Node Card */}
        <div 
          onClick={() => node.children.length > 0 ? null : onEdit(node)}
          className={`
            relative z-10 px-5 py-3 rounded-xl shadow-lg cursor-pointer min-w-[120px] max-w-[240px]
            transition-transform duration-200 hover:scale-105 border-b-4
            ${getBgColor(depth)}
            ${depth > 1 ? 'border-stone-200' : 'border-transparent'}
          `}
        >
          <h4 className={`font-bold text-sm truncate ${getTextColor(depth)}`}>
            {node.title}
          </h4>
          {node.content && depth > 0 && (
            <p className={`text-[10px] mt-1 line-clamp-2 opacity-80 ${getTextColor(depth)}`}>
              {node.content}
            </p>
          )}
          
          {/* Add Child Button (Hanging below) */}
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            className={`
              absolute -bottom-3 left-1/2 transform -translate-x-1/2
              w-6 h-6 rounded-full flex items-center justify-center
              bg-white border border-stone-200 text-stone-400 shadow-sm
              hover:bg-leaf-500 hover:text-white hover:border-leaf-500 transition-colors
              opacity-0 group-hover:opacity-100
            `}
            title="Alt Dal Ekle"
          >
            <Icons.Add size={14} />
          </button>
        </div>
      </div>

      {/* Recursively render children */}
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map(child => (
            <MindMapNode 
              key={child.id} 
              node={child} 
              onAddChild={onAddChild}
              onAddSibling={(siblingId) => onAddChild(node.id)} // Adding sibling to child is adding child to parent
              onDelete={onDelete}
              onEdit={onEdit}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
