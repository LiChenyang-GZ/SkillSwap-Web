import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { 
  Plus,
  X,
  Users,
  Globe,
  Info,
  Upload
} from 'lucide-react';
import { categories, skillLevels } from '../lib/mock-data';

export function CreateWorkshop() {
  const { user, setCurrentPage, createWorkshop } = useApp();
  
  // Workshop form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    skillLevel: '',
    duration: '',
    maxParticipants: '',
    date: '',
    time: '',
    location: '',
    isOnline: false,
    tags: [] as string[],
    materials: [] as string[],
    requirements: [] as string[],
  });

  const [newTag, setNewTag] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newRequirement, setNewRequirement] = useState('');

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, newTag.trim()] 
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addMaterial = () => {
    if (newMaterial.trim() && !formData.materials.includes(newMaterial.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        materials: [...prev.materials, newMaterial.trim()] 
      }));
      setNewMaterial('');
    }
  };

  const removeMaterial = (materialToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(material => material !== materialToRemove)
    }));
  };

  const addRequirement = () => {
    if (newRequirement.trim() && !formData.requirements.includes(newRequirement.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        requirements: [...prev.requirements, newRequirement.trim()] 
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (requirementToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter(req => req !== requirementToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWorkshop({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        skillLevel: formData.skillLevel,
        duration: parseInt(formData.duration),
        maxParticipants: parseInt(formData.maxParticipants),
        // Legacy fields kept for backend DTO compatibility.
        creditCost: 0,
        creditReward: 0,
        date: formData.date,
        time: formData.time,
        location: formData.isOnline ? ['Virtual'] : [formData.location],
        isOnline: formData.isOnline,
        tags: formData.tags,
        materials: formData.materials,
        requirements: formData.requirements,
      });
    } catch (error) {
      // Error is handled in the context
    }
  };

  const isFormValid = () => {
    return formData.title && 
           formData.description && 
           formData.category && 
           formData.skillLevel && 
           formData.duration && 
           formData.maxParticipants && 
           formData.date && 
           formData.time &&
           (formData.isOnline || formData.location);
  };

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Create Workshop</h1>
          <p className="text-lg text-muted-foreground">
            Share your expertise by hosting a workshop for the community.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Workshop Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Advanced React Patterns & Performance"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what participants will learn and what makes your workshop valuable..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category} onValueChange={(value: string) => handleInputChange('category', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="skillLevel">Skill Level *</Label>
                      <Select value={formData.skillLevel} onValueChange={(value: string) => handleInputChange('skillLevel', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select skill level" />
                        </SelectTrigger>
                        <SelectContent>
                          {skillLevels.map(level => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule & Logistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Schedule & Logistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration">Duration (minutes) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="90"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxParticipants">Max Participants *</Label>
                      <Input
                        id="maxParticipants"
                        type="number"
                        placeholder="15"
                        value={formData.maxParticipants}
                        onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="time">Time *</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => handleInputChange('time', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Switch
                        id="isOnline"
                        checked={formData.isOnline}
                        onCheckedChange={(checked: boolean) => handleInputChange('isOnline', checked)}
                      />
                      <Label htmlFor="isOnline" className="flex items-center space-x-2">
                        <Globe className="w-4 h-4" />
                        <span>Online Workshop</span>
                      </Label>
                    </div>
                    
                    {!formData.isOnline && (
                      <div>
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          placeholder="e.g., Creative Hub, Downtown - Room 205"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag (e.g., React, JavaScript)"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="flex-1"
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Materials & Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle>Materials & Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Materials */}
                  <div>
                    <Label className="text-base">Materials Provided</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      What will you provide to participants?
                    </p>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Code repository, Slides, Practice exercises"
                          value={newMaterial}
                          onChange={(e) => setNewMaterial(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                          className="flex-1"
                        />
                        <Button type="button" onClick={addMaterial} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {formData.materials.length > 0 && (
                        <ul className="space-y-2">
                          {formData.materials.map((material, index) => (
                            <li key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{material}</span>
                              <button
                                type="button"
                                onClick={() => removeMaterial(material)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div>
                    <Label className="text-base">Prerequisites</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      What should participants know before attending?
                    </p>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Basic JavaScript knowledge"
                          value={newRequirement}
                          onChange={(e) => setNewRequirement(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                          className="flex-1"
                        />
                        <Button type="button" onClick={addRequirement} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {formData.requirements.length > 0 && (
                        <ul className="space-y-2">
                          {formData.requirements.map((requirement, index) => (
                            <li key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{requirement}</span>
                              <button
                                type="button"
                                onClick={() => removeRequirement(requirement)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {formData.title || 'Workshop Title'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {formData.description || 'Workshop description will appear here...'}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>0/{formData.maxParticipants || '0'}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Free to join
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-muted-foreground/20 rounded-full" />
                      <span className="text-sm text-muted-foreground">{user?.username}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Info className="w-5 h-5" />
                    <span>Tips for Success</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Be specific about learning outcomes</li>
                    <li>• Set realistic expectations for skill level</li>
                    <li>• Provide clear prerequisites</li>
                    <li>• Prepare engaging materials</li>
                    <li>• Plan interactive elements</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-border">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setCurrentPage('dashboard')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid()}
              className="min-w-[120px]"
            >
              Create Workshop
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}