"use client";

import { useEffect, useState } from "react";
import { getApiBase, getApiOrigin } from "@/lib/apiBase";
import { Plus, Trash2, Edit2, ChevronRight, ChevronDown, Folder, FolderOpen, Search, Image as ImageIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Type ---
export interface Category {
  id: string;
  name: string;
  nameMn: string;
  image: string;
  description: string;
  productCount: number;
  parentId: string | null;
  order: number | null;
  children?: Category[];
  subcategories?: Category[];
}

// --- Sortable Category Item (for first-level only) ---
interface SortableCategoryItemProps {
  category: Category;
  onAddChild: (parentId: string, name: string, description: string, imageFile?: File) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { name: string; description?: string; imageFile?: File }) => void;
  level: number;
}

function SortableCategoryItem({ category, onAddChild, onDelete, onEdit, level }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CategoryItem
        category={category}
        onAddChild={onAddChild}
        onDelete={onDelete}
        onEdit={onEdit}
        level={level}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDraggable={true}
      />
    </div>
  );
}

// --- Category Item (Recursive) ---
interface CategoryItemProps {
  category: Category;
  onAddChild: (parentId: string, name: string, description: string, imageFile?: File) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { name: string; description?: string; imageFile?: File }) => void;
  level: number;
  dragHandleProps?: any;
  isDraggable?: boolean;
}

function CategoryItem({ category, onAddChild, onDelete, onEdit, level, dragHandleProps, isDraggable }: CategoryItemProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildDescription, setNewChildDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const hasChildren = (category.children && category.children.length > 0) || 
                     (category.subcategories && category.subcategories.length > 0);

  // Helper function to get correct image URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/default-category.jpg";
    
    // If it's a blob URL, return a default image
    if (imagePath.startsWith('blob:')) {
      return "/default-category.jpg";
    }
    
    // If it's already a full URL, return as-is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it's a relative path starting with /assets, make it full URL
    if (imagePath.startsWith('/assets')) {
      return `${getApiOrigin()}${imagePath}`;
    }
    
    // Default image for default-category.jpg or other relative paths
    return imagePath === "default-category.jpg" ? "/default-category.jpg" : `${getApiOrigin()}/assets/category/${imagePath}`;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  return (
    <div className={`${level > 0 ? 'ml-8' : ''} mt-1`}>
      <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Drag handle for first-level categories only */}
          {isDraggable && level === 0 && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded-sm flex-shrink-0 text-gray-400 hover:text-gray-600"
              title="Эрэмбэлэх"
            >
              <GripVertical size={16} />
            </div>
          )}
          
          {hasChildren && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-200 rounded-sm flex-shrink-0"
            >
              {expanded ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </button>
          )}
          
          {!hasChildren && !isDraggable && <div className="w-6 flex-shrink-0" />}
          {!hasChildren && isDraggable && level > 0 && <div className="w-6 flex-shrink-0" />}
          
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0">
              {category.image && category.image !== "default-category.jpg" && !category.image.startsWith('blob:') ? (
                <img 
                  src={getImageUrl(category.image)} 
                  alt={category.name}
                  className="w-8 h-8 object-cover rounded-md border"
                  onError={(e) => {
                    e.currentTarget.src = "/default-category.jpg";
                    e.currentTarget.onerror = null; // Prevent infinite loop
                  }}
                />
              ) : (
                expanded ? (
                  <FolderOpen size={18} className="text-gray-700" />
                ) : (
                  <Folder size={18} className="text-gray-500" />
                )
              )}
            </div>
            
            {editing ? (
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border border-gray-300 px-3 py-1.5 rounded text-sm flex-1"
                    placeholder="Нэр"
                    autoFocus
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border border-gray-300 px-3 py-1.5 rounded text-sm flex-1"
                    placeholder="Тайлбар"
                  />
                  <label className="cursor-pointer border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50">
                    <ImageIcon size={16} className="inline mr-1" />
                    Зураг
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      onEdit(category.id, { 
                        name, 
                        description: description || undefined,
                        imageFile 
                      });
                      setEditing(false);
                    }}
                    className="h-8 px-3"
                    disabled={!name.trim()}
                  >
                    Хадгалах
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setEditing(false);
                      setName(category.name);
                      setDescription(category.description || "");
                      setImageFile(undefined);
                    }}
                    className="h-8 px-3"
                  >
                    Цуцлах
                  </Button>
                </div>
              </div>
            ) : (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium truncate ${
                    level === 0 ? 'text-base' : 
                    level === 1 ? 'text-sm' : 
                    'text-sm text-gray-600'
                  }`}>
                    {category.name}
                  </span>
                  {(category.children?.length || category.subcategories?.length || 0) > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {(category.children?.length || category.subcategories?.length || 0)}
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {category.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {!editing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="text-xs text-gray-500 mr-2">
              {category.productCount} бүт.
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowAddForm(true)}
              className="h-8 w-8 p-0"
              title="Дэд ангилал нэмэх"
            >
              <Plus size={14} />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setEditing(true)}
              className="h-8 w-8 p-0"
              title="Засах"
            >
              <Edit2 size={14} />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onDelete(category.id)}
              className="h-8 w-8 p-0 hover:text-red-600"
              title="Устгах"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>

      {/* Add form for this specific category */}
      {showAddForm && (
        <div className="ml-12 mt-2 mb-2 p-3 bg-blue-50 rounded-md border border-blue-100">
          <h4 className="text-sm font-medium mb-2 text-blue-800">
            {category.name} ангилалд дэд ангилал нэмэх
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="Дэд ангиллын нэр"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <input
              type="text"
              value={newChildDescription}
              onChange={(e) => setNewChildDescription(e.target.value)}
              placeholder="Тайлбар (заавал биш)"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <label className="block text-sm font-medium text-gray-700">
              Зураг (заавал биш)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                }
              }}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (newChildName.trim()) {
                    onAddChild(category.id, newChildName, newChildDescription, imageFile);
                    setNewChildName("");
                    setNewChildDescription("");
                    setImageFile(undefined);
                    setShowAddForm(false);
                  }
                }}
                disabled={!newChildName.trim()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Хадгалах
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewChildName("");
                  setNewChildDescription("");
                  setImageFile(undefined);
                }}
                size="sm"
              >
                Цуцлах
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasChildren && expanded && (
        <div className="mt-1">
          {(category.children || category.subcategories)?.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onEdit={onEdit}
              level={level + 1}
              isDraggable={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Helper: Build tree from flat array ---
function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  flat.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  map.forEach((cat) => {
    if (cat.parentId === null) {
      roots.push(cat);
    } else {
      const parent = map.get(cat.parentId);
      if (parent) parent.children!.push(cat);
    }
  });

  // Sort roots by order, then by name
  roots.sort((a, b) => {
    if (a.order !== null && b.order !== null) {
      return a.order - b.order;
    }
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return a.name.localeCompare(b.name);
  });

  return roots;
}

// --- Page ---
export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);

  // API base URL
  const API_URL = `${getApiBase()}/categories`;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - update category order
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Only allow reordering first-level categories (parentId === null)
    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Check if both are first-level categories
    if (categories[oldIndex].parentId !== null || categories[newIndex].parentId !== null) {
      return;
    }

    // Update local state optimistically
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // Update order in backend
    try {
      const categoryIds = newCategories
        .filter((cat) => cat.parentId === null)
        .map((cat) => cat.id);

      const response = await fetch(`${API_URL}/order/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category order');
      }

      // Refresh categories to get updated order from backend
      await fetchCategories();
    } catch (err) {
      console.error('Error updating category order:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category order');
      // Revert to original order on error
      await fetchCategories();
    }
  };

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched categories:', data);
      
      // Handle both flat and tree formats
      if (Array.isArray(data)) {
        setFlatCategories(data);
        setCategories(buildTree(data));
      } else if (data.tree) {
        // If tree is provided, ensure it's sorted by order
        const sortedTree = [...(data.tree || [])].sort((a, b) => {
          if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.order !== null && a.order !== undefined) return -1;
          if (b.order !== null && b.order !== undefined) return 1;
          return a.name.localeCompare(b.name);
        });
        setCategories(sortedTree);
        setFlatCategories(data.flat || []);
      } else {
        setFlatCategories(data);
        setCategories(buildTree(data));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  // Create category via API with file upload support
  const createCategory = async (name: string, parentId: string | null = null, description: string = "", imageFile?: File) => {
    try {
      // JSON when no file: avoids multipart/multer issues in production (empty req.body).
      let response: Response;
      if (imageFile) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('nameMn', name);
        formData.append('description', description);
        formData.append('productCount', '0');
        if (parentId) {
          formData.append('parentId', parentId);
        }
        formData.append('image', imageFile);
        response = await fetch(API_URL, { method: 'POST', body: formData });
      } else {
        response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            nameMn: name.trim(),
            description: description || '',
            productCount: 0,
            parentId: parentId || null,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await fetchCategories();
      return true;
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to create category');
      return false;
    }
  };

  // Update category via API
  const updateCategory = async (id: string, updates: { name: string; description?: string; imageFile?: File }) => {
    try {
      let response: Response;
      if (updates.imageFile) {
        const formData = new FormData();
        formData.append('name', updates.name);
        formData.append('nameMn', updates.name);
        if (updates.description !== undefined) {
          formData.append('description', updates.description);
        }
        formData.append('image', updates.imageFile);
        response = await fetch(`${API_URL}/${id}`, { method: 'PATCH', body: formData });
      } else {
        response = await fetch(`${API_URL}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updates.name.trim(),
            nameMn: updates.name.trim(),
            ...(updates.description !== undefined ? { description: updates.description } : {}),
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await fetchCategories();
      return true;
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category');
      return false;
    }
  };

  // Handle adding child category
  const handleAddChild = async (parentId: string, name: string, description: string = "", imageFile?: File) => {
    if (!name.trim()) return;
    
    const success = await createCategory(name, parentId, description, imageFile);
    return success;
  };

  const handleEdit = async (id: string, updates: { name: string; description?: string; imageFile?: File }) => {
    if (!updates.name.trim()) return;
    await updateCategory(id, updates);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    
    const success = await createCategory(newName, null, newDescription, imageFile);
    if (success) {
      setAddingTo(null);
      setNewName("");
      setNewDescription("");
      setImageFile(undefined);
    }
  };

  // Delete category via API
  const deleteCategory = async (id: string) => {
    if (!window.confirm('Та энэ ангиллыг устгахдаа итгэлтэй байна уу? Дэд ангиллууд байвал тэдгээрийг эхлээд устгана уу.')) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await fetchCategories();
      return true;
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, []);

  // Filter categories based on search
  const filteredFlatCategories = searchTerm 
    ? flatCategories.filter(cat => 
        cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.nameMn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : flatCategories;

  const displayCategories = searchTerm 
    ? buildTree(filteredFlatCategories)
    : categories;

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
  };

  // Calculate stats
  const totalCategories = flatCategories.length;
  const mainCategories = flatCategories.filter(c => c.parentId === null).length;
  const subCategories = flatCategories.filter(c => c.parentId !== null).length;

  if (loading) {
    return (
      <div className="w-full p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Ангиллыг уншиж байна...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Ангилал</h1>
            <p className="text-sm text-gray-600 mt-1">
              Нийт {totalCategories} ангилал ({mainCategories} үндсэн, {subCategories} дэд)
            </p>
          </div>
          <Button 
            onClick={() => setAddingTo("root")}
            className="whitespace-nowrap"
          >
            <Plus size={18} className="mr-2" />
            Ангилал нэмэх
          </Button>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Ангиллын нэрээр хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            Хаах
          </button>
        </div>
      )}

      {/* Add New Category Form (Root level) */}
      {addingTo === "root" && (
        <div className="m-4 p-4 border rounded-md bg-gray-50">
          <h3 className="font-medium mb-3">Шинэ үндсэн ангилал нэмэх</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Нэр *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ангиллын нэр"
                className="w-full px-3 py-2 border rounded-md text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Зураг (заавал биш)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                  }
                }}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тайлбар (заавал биш)
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Тайлбар"
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="text-sm"
              >
                Хадгалах
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAddingTo(null);
                  setNewName("");
                  setNewDescription("");
                  setImageFile(undefined);
                }}
                className="text-sm"
              >
                Цуцлах
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="p-4">
        {displayCategories.length === 0 ? (
          <div className="text-center py-12 border rounded-md">
            <Folder className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="text-gray-500">
              {searchTerm ? "Хайлтад тохирох ангилал олдсонгүй" : "Ангилал олдсонгүй"}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setAddingTo("root")}
                variant="outline"
                className="mt-3"
              >
                Эхний ангилал нэмэх
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 text-sm font-medium text-gray-700 border-b">
              <div className="col-span-7">Ангилал</div>
              <div className="col-span-3">Тайлбар</div>
              <div className="col-span-1 text-center">Бүтээгдэхүүн</div>
              <div className="col-span-1 text-right">Үйлдэл</div>
            </div>

            {/* Categories Tree with Drag and Drop */}
            {!searchTerm ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayCategories.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayCategories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      onAddChild={handleAddChild}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      level={0}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              // When searching, don't use drag and drop
              displayCategories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onAddChild={handleAddChild}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  level={0}
                  isDraggable={false}
                />
              ))
            )}
          </div>
        )}

        {/* Stats Summary */}
        {!searchTerm && flatCategories.length > 0 && (
          <div className="mt-6 text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Folder size={14} />
                <span>Нийт: {totalCategories}</span>
              </div>
              <div className="flex items-center gap-2">
                <FolderOpen size={14} />
                <span>Үндсэн: {mainCategories}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="ml-6">
                  <Folder size={14} />
                </div>
                <span>Дэд: {subCategories}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}