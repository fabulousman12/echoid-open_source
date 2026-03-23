import React, { useEffect, useState } from 'react';
import { IonSpinner } from '@ionic/react';
import { Document, Page } from 'react-pdf';
import {
  createObjectUrlFromWebFileRef,
  isWebStoredFileRef,
  revokeResolvedObjectUrl,
} from '../services/webFileStore';

interface Props {
  data: string;
  style?: React.CSSProperties;
  className?: string;
  type?: string;
}

const DocumentRenderer: React.FC<Props> = ({ data, style, className, type }) => {
  const [loading, setLoading] = useState(true);
  const [resolvedData, setResolvedData] = useState(data);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    const resolveDocument = async () => {
      setLoading(true);
      if (isWebStoredFileRef(data)) {
        objectUrl = await createObjectUrlFromWebFileRef(data);
        if (active) setResolvedData(objectUrl || data);
      } else {
        setResolvedData(data);
      }

      if (active) {
        setTimeout(() => {
          if (active) setLoading(false);
        }, 100);
      }
    };

    resolveDocument();

    return () => {
      active = false;
      revokeResolvedObjectUrl(objectUrl);
    };
  }, [data]);

  if (loading) return <IonSpinner name="dots" />;
  if (!resolvedData) return <div>Failed to load document</div>;

  if (type === 'pdf') {
    return (
      <div
        className={className}
        style={{ width: '100%', height: '600px', overflow: 'auto', ...style }}
      >
        <Document file={resolvedData} loading={<IonSpinner name="dots" />}>
          <Page pageNumber={1} width={600} />
        </Document>
      </div>
    );
  }

  if (type === 'txt') {
    return (
      <iframe
        src={resolvedData}
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
        <a href={resolvedData} download target="_blank" rel="noopener noreferrer">
          Click here to download
        </a>
        .
      </p>
    </div>
  );
};

export default DocumentRenderer;
