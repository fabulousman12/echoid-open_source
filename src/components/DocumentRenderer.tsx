import React, { useEffect, useState } from 'react';
import { IonSpinner } from '@ionic/react';
import { Document, Page } from 'react-pdf';

interface Props {
  data: string; // sandbox URL or Blob URL
  style?: React.CSSProperties;
  className?: string;
  type?: string;
}

const DocumentRenderer: React.FC<Props> = ({ data, style, className, type }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No need to resolve path anymore; just wait a tick for loading effect
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [data]);

  if (loading) return <IonSpinner name="dots" />;

  if (!data) return <div>Failed to load document</div>;

  const fileType = type;

  if (fileType === 'pdf') {
    return (
      <div
        className={className}
        style={{ width: '100%', height: '600px', overflow: 'auto', ...style }}
      >
        <Document file={data} loading={<IonSpinner name="dots" />}>
          <Page pageNumber={1} width={600 /* adjust width */} />
        </Document>
      </div>
    );
  }

  if (fileType === 'txt') {
    return (
      <iframe
        src={data}
        className={className}
        style={{ width: '100%', height: '400px', ...style }}
        title="Text Preview"
      />
    );
  }

  return (
    <div className={className} style={style}>
      <p>
        Preview not supported.{' '}
        <a href={data} download target="_blank" rel="noopener noreferrer">
          Click here to download
        </a>
        .
      </p>
    </div>
  );
};

export default DocumentRenderer;
