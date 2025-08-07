import { DocumentInfo, DocumentGroup, GroupingStrategy } from './ChunkingStrategy';
import { logger, LogCategory } from '../../logging/Logger';

export class TitleSimilarityGrouper implements GroupingStrategy {
  name = 'title_similarity';

  async groupDocuments(documents: DocumentInfo[]): Promise<DocumentGroup[]> {
    logger.info(LogCategory.SYSTEM, 'Grouping documents by title similarity');
    
    const groups: DocumentGroup[] = [];
    const processedDocs = new Set<string>();
    
    for (const doc of documents) {
      if (processedDocs.has(doc.docId)) continue;
      
      const similarDocs = this.findSimilarDocuments(doc, documents);
      if (similarDocs.length > 1) {
        const group = this.createGroup(doc, similarDocs, 'title_similarity');
        groups.push(group);
        similarDocs.forEach(d => processedDocs.add(d.docId));
      }
    }
    
    return groups;
  }

  findRelatedGroups(documentId: string, groups: DocumentGroup[]): DocumentGroup[] {
    return groups.filter(group => group.documents.includes(documentId));
  }

  private findSimilarDocuments(targetDoc: DocumentInfo, allDocs: DocumentInfo[]): DocumentInfo[] {
    const similarDocs = [targetDoc];
    const targetTitle = this.normalizeTitle(targetDoc.title);
    
    for (const doc of allDocs) {
      if (doc.docId === targetDoc.docId) continue;
      
      const docTitle = this.normalizeTitle(doc.title);
      const similarity = this.calculateTitleSimilarity(targetTitle, docTitle);
      
      if (similarity > 0.7) {
        similarDocs.push(doc);
      }
    }
    
    return similarDocs;
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.split(' '));
    const words2 = new Set(title2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private createGroup(baseDoc: DocumentInfo, similarDocs: DocumentInfo[], groupType: 'title_similarity' | 'date_based' | 'category_based' | 'version_based'): DocumentGroup {
    const docIds = similarDocs.map(d => d.docId);
    const latestDoc = this.findLatestDocument(similarDocs);
    
    return {
      groupId: `group_${baseDoc.docId}_${groupType}`,
      groupType,
      documents: docIds,
      latestDocument: latestDoc.docId,
      versionNumbers: this.assignVersionNumbers(similarDocs),
      groupMetadata: {
        baseTitle: baseDoc.title,
        description: `Documents with similar titles to "${baseDoc.title}"`
      }
    };
  }

  private findLatestDocument(docs: DocumentInfo[]): DocumentInfo {
    return docs.reduce((latest, current) => {
      const latestDate = new Date(latest.issueDate);
      const currentDate = new Date(current.issueDate);
      return currentDate > latestDate ? current : latest;
    });
  }

  private assignVersionNumbers(docs: DocumentInfo[]): Record<string, number> {
    const sortedDocs = docs.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
    const versionNumbers: Record<string, number> = {};
    
    sortedDocs.forEach((doc, index) => {
      versionNumbers[doc.docId] = index + 1;
    });
    
    return versionNumbers;
  }
}

export class DateBasedGrouper implements GroupingStrategy {
  name = 'date_based';

  async groupDocuments(documents: DocumentInfo[]): Promise<DocumentGroup[]> {
    logger.info(LogCategory.SYSTEM, 'Grouping documents by date');
    
    const groups: DocumentGroup[] = [];
    const dateGroups = new Map<string, DocumentInfo[]>();
    
    for (const doc of documents) {
      const dateKey = this.extractDateFromDocId(doc.docId);
      if (dateKey) {
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(doc);
      }
    }
    
    for (const [dateKey, docs] of dateGroups) {
      if (docs.length > 1) {
        const group = this.createGroup(docs[0], docs, 'date_based', dateKey);
        groups.push(group);
      }
    }
    
    return groups;
  }

  findRelatedGroups(documentId: string, groups: DocumentGroup[]): DocumentGroup[] {
    return groups.filter(group => group.documents.includes(documentId));
  }

  private extractDateFromDocId(docId: string): string | null {
    // Extract date from doc_id format like "20040519-9-EN"
    const match = docId.match(/^(\d{8})-\d+-[A-Z]+$/);
    return match ? match[1] : null;
  }

  private createGroup(baseDoc: DocumentInfo, docs: DocumentInfo[], groupType: 'title_similarity' | 'date_based' | 'category_based' | 'version_based', dateKey?: string): DocumentGroup {
    const docIds = docs.map(d => d.docId);
    const latestDoc = this.findLatestDocument(docs);
    
    return {
      groupId: `group_${dateKey || baseDoc.docId}_${groupType}`,
      groupType,
      documents: docIds,
      latestDocument: latestDoc.docId,
      versionNumbers: this.assignVersionNumbers(docs),
      groupMetadata: {
        baseDate: dateKey,
        description: `Documents from date ${dateKey}`
      }
    };
  }

  private findLatestDocument(docs: DocumentInfo[]): DocumentInfo {
    return docs.reduce((latest, current) => {
      const latestDate = new Date(latest.issueDate);
      const currentDate = new Date(current.issueDate);
      return currentDate > latestDate ? current : latest;
    });
  }

  private assignVersionNumbers(docs: DocumentInfo[]): Record<string, number> {
    const sortedDocs = docs.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
    const versionNumbers: Record<string, number> = {};
    
    sortedDocs.forEach((doc, index) => {
      versionNumbers[doc.docId] = index + 1;
    });
    
    return versionNumbers;
  }
}

export class CategoryBasedGrouper implements GroupingStrategy {
  name = 'category_based';

  private categoryGroups = {
    'CIR': ['Circular'],
    'SPM-SGL': ['SPM Statutory Guideline'],
    'GLI': ['Guideline'],
    'SPM-NGL': ['SPM Non-Statutory Guideline'],
    'COP': ['Code of Practice'],
    'GTA': ['Guide to Authorization'],
    'SPM': ['Supervisory Policy Manual'],
    'IGL': ['Guidance developed in conjunction with industry']
  };

  async groupDocuments(documents: DocumentInfo[]): Promise<DocumentGroup[]> {
    logger.info(LogCategory.SYSTEM, 'Grouping documents by category');
    
    const groups: DocumentGroup[] = [];
    const categoryGroups = new Map<string, DocumentInfo[]>();
    
    for (const doc of documents) {
      const category = this.getDocumentCategory(doc);
      if (category) {
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }
        categoryGroups.get(category)!.push(doc);
      }
    }
    
    for (const [category, docs] of categoryGroups) {
      if (docs.length > 1) {
        const group = this.createGroup(docs[0], docs, 'category_based', category);
        groups.push(group);
      }
    }
    
    return groups;
  }

  findRelatedGroups(documentId: string, groups: DocumentGroup[]): DocumentGroup[] {
    return groups.filter(group => group.documents.includes(documentId));
  }

  private getDocumentCategory(doc: DocumentInfo): string | null {
    const docType = doc.docTypeCode;
    const docDesc = doc.docTypeDesc;
    
    for (const [category, descriptions] of Object.entries(this.categoryGroups)) {
      if (docType === category || descriptions.some(desc => docDesc.includes(desc))) {
        return category;
      }
    }
    
    return null;
  }

  private createGroup(baseDoc: DocumentInfo, docs: DocumentInfo[], groupType: 'title_similarity' | 'date_based' | 'category_based' | 'version_based', category?: string): DocumentGroup {
    const docIds = docs.map(d => d.docId);
    const latestDoc = this.findLatestDocument(docs);
    
    return {
      groupId: `group_${category || baseDoc.docId}_${groupType}`,
      groupType,
      documents: docIds,
      latestDocument: latestDoc.docId,
      versionNumbers: this.assignVersionNumbers(docs),
      groupMetadata: {
        category,
        description: `Documents in category ${category}`
      }
    };
  }

  private findLatestDocument(docs: DocumentInfo[]): DocumentInfo {
    return docs.reduce((latest, current) => {
      const latestDate = new Date(latest.issueDate);
      const currentDate = new Date(current.issueDate);
      return currentDate > latestDate ? current : latest;
    });
  }

  private assignVersionNumbers(docs: DocumentInfo[]): Record<string, number> {
    const sortedDocs = docs.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
    const versionNumbers: Record<string, number> = {};
    
    sortedDocs.forEach((doc, index) => {
      versionNumbers[doc.docId] = index + 1;
    });
    
    return versionNumbers;
  }
}

export class DocumentGroupingManager {
  private groupers: GroupingStrategy[] = [
    new TitleSimilarityGrouper(),
    new DateBasedGrouper(),
    new CategoryBasedGrouper()
  ];

  async groupAllDocuments(documents: DocumentInfo[]): Promise<DocumentGroup[]> {
    logger.info(LogCategory.SYSTEM, 'Starting comprehensive document grouping');
    
    const allGroups: DocumentGroup[] = [];
    
    for (const grouper of this.groupers) {
      try {
        const groups = await grouper.groupDocuments(documents);
        allGroups.push(...groups);
        logger.info(LogCategory.SYSTEM, `Created ${groups.length} groups using ${grouper.name}`);
      } catch (error) {
        logger.error(LogCategory.SYSTEM, `Error in ${grouper.name} grouping:`, error);
      }
    }
    
    // Remove duplicate groups
    const uniqueGroups = this.removeDuplicateGroups(allGroups);
    
    logger.info(LogCategory.SYSTEM, `Total unique groups created: ${uniqueGroups.length}`);
    return uniqueGroups;
  }

  private removeDuplicateGroups(groups: DocumentGroup[]): DocumentGroup[] {
    const uniqueGroups: DocumentGroup[] = [];
    const seenGroupIds = new Set<string>();
    
    for (const group of groups) {
      if (!seenGroupIds.has(group.groupId)) {
        uniqueGroups.push(group);
        seenGroupIds.add(group.groupId);
      }
    }
    
    return uniqueGroups;
  }

  findDocumentGroups(documentId: string, groups: DocumentGroup[]): DocumentGroup[] {
    return groups.filter(group => group.documents.includes(documentId));
  }

  getGroupById(groupId: string, groups: DocumentGroup[]): DocumentGroup | null {
    return groups.find(group => group.groupId === groupId) || null;
  }
}

