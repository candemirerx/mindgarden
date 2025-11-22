import { MindNode, Garden } from './types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_GARDEN_NAME = "Yeni Bahçe";

export const INITIAL_ROOT_NODE: MindNode = {
  id: 'root-1',
  title: 'Çekirdek Fikir',
  content: 'Bu senin fikrinin tohumu. Büyütmek için tıkla.',
  children: [],
  isExpanded: true,
};

export const SAMPLE_GARDENS: Garden[] = [
  {
    id: 'g-1',
    name: 'Yapay Zeka Projesi',
    createdAt: Date.now(),
    root: {
      id: 'n-1',
      title: 'AI Asistanı',
      content: 'Kişisel not alma asistanı projesi detayları.',
      isExpanded: true,
      children: [
        {
          id: 'n-2',
          title: 'Frontend',
          content: 'React ve Tailwind kullanılacak.',
          children: [],
          isExpanded: true
        },
        {
          id: 'n-3',
          title: 'Backend',
          content: 'Node.js veya Python düşünülebilir.',
          children: [
            {
              id: 'n-4',
              title: 'Veritabanı',
              content: 'Supabase veya Firebase.',
              children: [],
              isExpanded: true
            }
          ],
          isExpanded: true
        }
      ]
    }
  }
];
