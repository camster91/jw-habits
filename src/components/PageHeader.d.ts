import type React from 'react';

declare const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  gradient?: string;
  shadow?: boolean;
  noBlurs?: boolean;
  icon?: any;
}>;

export default PageHeader;
